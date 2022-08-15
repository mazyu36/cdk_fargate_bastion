import { BastionEcsResources } from './BastionEcsResources';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_iam as iam } from 'aws-cdk-lib';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { aws_kms as kms } from 'aws-cdk-lib';
import { aws_codecommit as codecommit } from 'aws-cdk-lib';
import { aws_codebuild as codebuild } from 'aws-cdk-lib';
import { aws_codepipeline as codepipeline } from 'aws-cdk-lib';
import { aws_codepipeline_actions as codepipeline_actions } from 'aws-cdk-lib';
import { EcrResources } from './EcrResources';
import { getBuildSpecConfig } from './config/buildspecConfig';


export class BastionCodePipelineResources {

  constructor(scope: Construct, ecrResources: EcrResources, bastionEcsResources: BastionEcsResources) {

    // KMSキーを作成
    const bastionArtifactKey = new kms.Key(scope, 'BastionKmsKey')

    // Artifact用バケット作成
    const bastionArtifactBucket = new s3.Bucket(scope, 'BastionArtifactBucket', {
      encryptionKey: bastionArtifactKey,
      accessControl: s3.BucketAccessControl.PRIVATE,
      encryption: s3.BucketEncryption.KMS,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      bucketName: 'bastion-codepipeline-artifact',
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(7)
        }
      ]
    })

    // Pipelineを定義
    const pipeline = new codepipeline.Pipeline(scope, 'BastionPipeline', {
      pipelineName: 'BastionPipeline',
      artifactBucket: bastionArtifactBucket
    });

    //--------------CodeCommit----------------
    // コードのリポジトリは手動作成したものを読み込み
    const bastionCodeRepository = codecommit.Repository.fromRepositoryName(scope, 'BastionRepository', 'BastionRepository')

    bastionCodeRepository.grantRead(pipeline.role)


    // Stageを追加
    const sourceStage = pipeline.addStage({
      stageName: 'Source'
    });

    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'Source',
      repository: bastionCodeRepository,
      branch: 'main',
      output: sourceOutput
    });
    sourceStage.addAction(sourceAction);


    //--------------CodeBuild----------------
    const buildSpecConfig = getBuildSpecConfig(ecrResources.bastionEcrRepository.repositoryName)

    const project = new codebuild.PipelineProject(scope, 'BastionBuildProject', {
      projectName: 'BastionBuildProject',
      buildSpec: codebuild.BuildSpec.fromObject(buildSpecConfig),
      environment: {
        privileged: true
      },
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER, codebuild.LocalCacheMode.CUSTOM)
    });

    // ECR操作のための権限付与
    project.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryPowerUser')
    );

    //stageを追加
    const buildStage = pipeline.addStage({
      stageName: 'Build'
    });

    const buildOutput = new codepipeline.Artifact();
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'BastionCodebuild',
      project: project,
      input: sourceOutput,
      outputs: [buildOutput],
      executeBatchBuild: false,
      combineBatchBuildArtifacts: false
    })

    buildStage.addAction(buildAction)


    //--------------CodeDeploy----------------
    // deploy to ECS
    const deployStage = pipeline.addStage({
      stageName: 'Deploy'
    });
    const deployAction = new codepipeline_actions.EcsDeployAction({
      actionName: 'Deploy_To_ECS',
      imageFile: buildOutput.atPath('imagedefinitions.json'),
      service: bastionEcsResources.bastionService
    });
    deployStage.addAction(deployAction);

  }
}