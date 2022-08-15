import { Construct } from 'constructs';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';

export class VpcResources {

  public readonly vpc: ec2.Vpc;
  public readonly subnetContainer1a: ec2.PrivateSubnet;
  public readonly subnetContainer1c: ec2.PrivateSubnet;
  public readonly subnetDB1a: ec2.PrivateSubnet;
  public readonly subnetDB1c: ec2.PrivateSubnet;
  public readonly subnetEgress1a: ec2.PrivateSubnet;
  public readonly subnetEgress1c: ec2.PrivateSubnet;

  constructor(scope: Construct,) {


    // VPCを作成
    this.vpc = new ec2.Vpc(scope, 'VPC',
      {
        natGateways: 0,  // デフォルトでは1だが不要なので0をセット
        maxAzs: 2,  // AZの数を2に指定
        cidr: '10.0.0.0/16',
        subnetConfiguration: [],  // デフォルトではAZごとにSubnetが作られてしまうため、明示的に作らないよう指定
        enableDnsHostnames: true,
        enableDnsSupport: true,
        vpcName: 'fargate-bastion-vpc'
      }
    )

    // インターネットゲートウェイを作成
    const cfnInternetGateway = new ec2.CfnInternetGateway(scope, 'InternetGateway', {
      tags: [{
        key: 'Name',
        value: 'Internet-gateway'
      }]
    })

    // IGWをVPCにアタッチ
    const gatewayAttachment = new ec2.CfnVPCGatewayAttachment(scope, 'IGW2VPC', {
      vpcId: this.vpc.vpcId,
      internetGatewayId: cfnInternetGateway.ref
    })

    this.subnetContainer1a = new ec2.PrivateSubnet(scope, 'PrivateSubnetContainer1a',
      {
        availabilityZone: 'ap-northeast-1a',
        vpcId: this.vpc.vpcId,
        cidrBlock: '10.0.1.0/24',
        mapPublicIpOnLaunch: false
      }
    )
    cdk.Tags.of(this.subnetContainer1a).add('Name', 'container-private-subnet-1a')

    this.subnetContainer1c = new ec2.PrivateSubnet(scope, 'PrivateSubnetContainer1c',
      {
        availabilityZone: 'ap-northeast-1c',
        vpcId: this.vpc.vpcId,
        cidrBlock: '10.0.2.0/24',
        mapPublicIpOnLaunch: false
      }
    )
    cdk.Tags.of(this.subnetContainer1c).add('Name', 'container-private-subnet-1c')

    this.subnetDB1a = new ec2.PrivateSubnet(scope, 'PrivateSubnetDB1a',
      {
        availabilityZone: 'ap-northeast-1a',
        vpcId: this.vpc.vpcId,
        cidrBlock: '10.0.10.0/24',
        mapPublicIpOnLaunch: false
      }
    )
    cdk.Tags.of(this.subnetDB1a).add('Name', 'db-private-subnet-1a')


    this.subnetDB1c = new ec2.PrivateSubnet(scope, 'PrivateSubnetDB1c',
      {
        availabilityZone: 'ap-northeast-1c',
        vpcId: this.vpc.vpcId,
        cidrBlock: '10.0.11.0/24',
        mapPublicIpOnLaunch: false
      }
    )
    cdk.Tags.of(this.subnetDB1c).add('Name', 'db-private-subnet-1c')

    this.subnetEgress1a = new ec2.PrivateSubnet(scope, 'EgressSubnet1a',
      {
        availabilityZone: 'ap-northeast-1a',
        vpcId: this.vpc.vpcId,
        cidrBlock: '10.0.100.0/24'
      }
    )
    cdk.Tags.of(this.subnetEgress1a).add('Name', 'egress-private-subnet-1a')


    this.subnetEgress1c = new ec2.PrivateSubnet(scope, 'EgressSubnet1c',
      {
        availabilityZone: 'ap-northeast-1c',
        vpcId: this.vpc.vpcId,
        cidrBlock: '10.0.101.0/24'
      }
    )
    cdk.Tags.of(this.subnetEgress1c).add('Name', 'egress-private-subnet-1c')

  }
}