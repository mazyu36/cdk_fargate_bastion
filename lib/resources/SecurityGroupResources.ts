import { Construct } from 'constructs'
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { VpcResources } from './vpcResources';


export class SecurityGroupResources {

  public readonly bastionSg: ec2.SecurityGroup;
  public readonly databaseSg: ec2.SecurityGroup;
  public readonly vpcEndpointSg: ec2.SecurityGroup;

  constructor(scope: Construct, vpcResources: VpcResources) {
    //コンテナのSGを作成
    this.bastionSg = new ec2.SecurityGroup(scope, 'SecurityGroupContainer',
      {
        securityGroupName: 'security-group-container',
        vpc: vpcResources.vpc,
      })

    //DBのSGを作成
    this.databaseSg = new ec2.SecurityGroup(scope, 'SecurityGroupDatabase',
      {
        securityGroupName: 'security-group-db',
        vpc: vpcResources.vpc,
      })

    //Container->DBのインバウンドルール追加
    this.databaseSg.addIngressRule(ec2.Peer.securityGroupId(this.bastionSg.securityGroupId), ec2.Port.tcp(3306))

    //VPCエンドポイントのSGを作成
    const vpcEndpointSg = new ec2.SecurityGroup(scope, 'VpcEndpointSG',
      {
        securityGroupName: 'security-group-vpce',
        vpc: vpcResources.vpc,
      })

    //Container->VPCEのインバウンドルール追加
    vpcEndpointSg.addIngressRule(ec2.Peer.securityGroupId(this.bastionSg.securityGroupId), ec2.Port.tcp(443))


    // インタフェース型VPCエンドポイントを作成
    vpcResources.vpc.addInterfaceEndpoint('VpceEcrApi', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      open: true,
      privateDnsEnabled: true,
      securityGroups: [vpcEndpointSg],
      subnets: {
        subnets: [vpcResources.subnetEgress1a, vpcResources.subnetEgress1c]
      }
    });

    // インタフェース型VPCエンドポイントを作成
    vpcResources.vpc.addInterfaceEndpoint('VpceEcrDkr', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      open: true,
      privateDnsEnabled: true,
      securityGroups: [vpcEndpointSg],
      subnets: {
        subnets: [vpcResources.subnetEgress1a, vpcResources.subnetEgress1c]
      }
    });

    //ゲートウェイ型VPCエンドポイントを作成
    vpcResources.vpc.addGatewayEndpoint('VpceS3', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{
        // subnets: [vpcResources.subnetEgress1a, vpcResources.subnetEgress1c]
        subnets: [vpcResources.subnetContainer1a, vpcResources.subnetContainer1c]
      }]
    })

    // インタフェース型VPCエンドポイントを作成
    vpcResources.vpc.addInterfaceEndpoint('VpceCWLogs', {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      open: true,
      privateDnsEnabled: true,
      securityGroups: [vpcEndpointSg],
      subnets: {
        subnets: [vpcResources.subnetEgress1a, vpcResources.subnetEgress1c]
      }
    });

    // インタフェース型VPCエンドポイントを作成
    vpcResources.vpc.addInterfaceEndpoint('VpceSecretesManager', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      open: true,
      privateDnsEnabled: true,
      securityGroups: [vpcEndpointSg],
      subnets: {
        subnets: [vpcResources.subnetEgress1a, vpcResources.subnetEgress1c]
      }
    })

    // インタフェース型VPCエンドポイントを作成（SSM関連のサービス利用に必要）
    vpcResources.vpc.addInterfaceEndpoint('VpceSsmMessages', {
      service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
      open: true,
      privateDnsEnabled: true,
      securityGroups: [vpcEndpointSg],
      subnets: {
        subnets: [vpcResources.subnetEgress1a, vpcResources.subnetEgress1c]
      }
    })

    // インタフェース型VPCエンドポイントを作成（セッションマネージャーの確立に必要）
    vpcResources.vpc.addInterfaceEndpoint('VpceSsm', {
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
      open: true,
      privateDnsEnabled: true,
      securityGroups: [vpcEndpointSg],
      subnets: {
        subnets: [vpcResources.subnetEgress1a, vpcResources.subnetEgress1c]
      }
    })
  }

}