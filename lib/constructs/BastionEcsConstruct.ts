import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_logs as logs } from 'aws-cdk-lib';
import { VpcConstruct } from './VpcConstruct';
import { AuroraConstruct } from './AuroraConstruct';
import { SecurityGroupConstruct } from './SecurityGroupConstruct';
import { EcrConstruct } from './EcrConstruct';
import { aws_ecs as ecs } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';



export interface BastionEcsConstructProps {
  vpcConstruct: VpcConstruct,
  auroraConstruct: AuroraConstruct,
  securityGroupConstruct: SecurityGroupConstruct,
  ecrConstruct: EcrConstruct
}



export class BastionEcsConstruct extends Construct {
  public readonly bastionService: ecs.FargateService;

  constructor(scope: Construct, id: string, props: BastionEcsConstructProps) {
    super(scope, id);

    //--------------ECSクラスタ作成----------------
    // ECSクラスターを作成
    const bastionCluster = new ecs.Cluster(scope, 'BastionCluster', {
      vpc: props.vpcConstruct.vpc,
      containerInsights: false,
      clusterName: 'fargate-bastion-cluseter'
    })

    //--------------タスク定義の設定----------------
    // Bastionのタスク定義
    const bastionTaskDefinition = new ecs.TaskDefinition(scope, 'BastionTaskDefinition', {
      compatibility: ecs.Compatibility.FARGATE,
      cpu: '256',
      memoryMiB: '512',
      family: 'fargate-bastion-task-definition'
    })

    // タスク実行ロールにDBのシークレットのread権限を付与
    const dbSecrets = props.auroraConstruct.dbCluster.secret!;

    // ログドライバーを作成
    const bastionLogging = new ecs.AwsLogDriver({
      streamPrefix: "ecs",
      logGroup: new logs.LogGroup(scope, "BastionLogGroup", {
        logGroupName: "/ecs/fargate-bastion",
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: logs.RetentionDays.THREE_DAYS
      }),
    })


    // タスク定義にコンテナを追加
    bastionTaskDefinition.addContainer('BastionApp', {
      containerName: props.ecrConstruct.bastionEcrRepository.repositoryName,
      image: ecs.ContainerImage.fromEcrRepository(props.ecrConstruct.bastionEcrRepository, 'latest'),
      secrets: {
        'DB_HOST': ecs.Secret.fromSecretsManager(dbSecrets, 'host'),
        'DB_NAME': ecs.Secret.fromSecretsManager(dbSecrets, 'dbname'),
        'DB_USERNAME': ecs.Secret.fromSecretsManager(dbSecrets, 'username'),
        'DB_PASSWORD': ecs.Secret.fromSecretsManager(dbSecrets, 'password'),
      },
      logging: bastionLogging
    })


    // タスク実行ロールにDBシークレットを読み取る権限を付与
    dbSecrets.grantRead(bastionTaskDefinition.executionRole!);

    // タスクロールに付与するポリシーを作成
    const bastionTaskRolePolicyStatement = new iam.Policy(scope, 'BastionSSMPolicy', {
      statements: [
        // ECSタスクがSSMへ権限を渡すためのPassRole
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['iam:PassRole'],
          resources: ['*'],
          conditions: {
            'StringEquals': { 'iam:PassedToService': 'ssm.amazonaws.com' }
          }
        }),
        // ECSタスク内でSSMのアクティベーションを発行するための権限
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'ssm:DeleteActivation',
            'ssm:RemoveTagsFromResource',
            'ssm:AddTagsToResource',
            'ssm:CreateActivation'
          ],
          resources: ['*']
        })
      ],
    })

    // タスクロールに作成したポリシー付与
    bastionTaskDefinition.taskRole.attachInlinePolicy(bastionTaskRolePolicyStatement)


    //--------------ECSタスクで使用するSSMのロール生成----------------
    // ECSタスクがSSMに渡すIAMロールを作成
    const bastionSSMserviceRole = new iam.Role(scope, 'SsmRoleForBastion', {
      assumedBy: new iam.ServicePrincipal('ssm.amazonaws.com'),
      description: 'IAM Role for passing from ECS Task to SSM',
      roleName: 'BastionSSMServiceRole'
    })

    //SSMが使用するポリシーを付与
    bastionSSMserviceRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'))

    //--------------ECSサービスの生成----------------
    this.bastionService = new ecs.FargateService(scope, 'BackendService', {
      cluster: bastionCluster,
      //enableExecuteCommand: false, // ECS Execを有効化する場合はここをtrueにする。
      taskDefinition: bastionTaskDefinition,
      desiredCount: 0,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      deploymentController: {
        type: ecs.DeploymentControllerType.ECS
      },
      circuitBreaker: { rollback: true },
      securityGroups: [props.securityGroupConstruct.bastionSg],
      vpcSubnets: {
        subnets:
          [props.vpcConstruct.subnetContainer1a, props.vpcConstruct.subnetContainer1c]
      },
    })

  }
}