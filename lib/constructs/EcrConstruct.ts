import { Construct } from 'constructs';
import { aws_ecr as ecr } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';

export interface EcrConstructProps {

}

export class EcrConstruct extends Construct {
  public readonly bastionEcrRepository: ecr.Repository;

  constructor(scope: Construct, id: string, props: EcrConstructProps) {
    super(scope, id);

    this.bastionEcrRepository = new ecr.Repository(scope, 'BastionEcrRepository', {
      repositoryName: 'fargate-bastion',
      imageScanOnPush: true,  // プッシュ時のイメージスキャンを有効化
      // イメージを5世代のみ保持するようライフサイクルルールを設定
      lifecycleRules: [
        {
          description: 'Only 5 generations of images are retained',
          rulePriority: 1,
          maxImageCount: 5
        }
      ],
      encryption: ecr.RepositoryEncryption.KMS, // 暗号化の設定
      removalPolicy: cdk.RemovalPolicy.DESTROY // スタック削除時にリポジトリも削除
    })

  }

}