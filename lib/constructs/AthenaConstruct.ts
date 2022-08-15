
import { Construct } from 'constructs';
import { CfnApplication } from 'aws-cdk-lib/aws-sam';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib'
import { SecurityGroupConstruct } from './SecurityGroupConstruct';
import { VpcConstruct } from './vpcConstruct';
import { AuroraConstruct } from './AuroraConstruct';
import { aws_athena as athena } from 'aws-cdk-lib';

export interface AthenaConstructProps {
  securityGroupConstruct: SecurityGroupConstruct,
  vpcConstruct: VpcConstruct,
  auroraConstruct: AuroraConstruct
}

export class AthenaConstruct extends Construct {
  constructor(scope: Construct, id: string, props: AthenaConstructProps) {
    super(scope, id);
    // Federated Query用のSpill Bucket
    const spillBucket = new s3.Bucket(scope, "AthenaFederatedSpill", {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })


    // Lambdaコネクタ
    new CfnApplication(scope, "LambdaApplication", {
      location: {
        applicationId: "arn:aws:serverlessrepo:us-east-1:292517598671:applications/AthenaJdbcConnector",
        semanticVersion: "2022.4.1"
      },
      parameters: {
        DefaultConnectionString: `mysql://jdbc:mysql://${props.auroraConstruct.dbCluster.clusterReadEndpoint.hostname}/bastion?\$\{${props.auroraConstruct.dbCluster.secret!.secretName}\}`,
        LambdaFunctionName: "athena_federated_query",
        SecretNamePrefix: `${props.auroraConstruct.dbCluster.secret?.secretName}`,
        SecurityGroupIds: props.securityGroupConstruct.bastionSg.securityGroupId,
        SpillBucket: spillBucket.bucketName,
        SubnetIds: props.vpcConstruct.subnetContainer1a.subnetId
      }
    })

    // Athena ワークグループを作成
    new athena.CfnWorkGroup(scope, 'AthenaWorkGroupV3', {
      name: 'WorkGroupV3',
      workGroupConfiguration: {
        engineVersion: {
          selectedEngineVersion: 'Athena engine version 3',
        },
      },
    });


  }
}