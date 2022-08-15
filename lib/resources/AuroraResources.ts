import { Construct } from 'constructs';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_rds as rds } from 'aws-cdk-lib';
import { AuroraMysqlEngineVersion } from 'aws-cdk-lib/aws-rds';
import { InstanceClass, InstanceSize } from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib'
import { VpcResources } from './vpcResources';
import { SecurityGroupResources } from './SecurityGroupResources';



export class AuroraResources {

  public readonly dbCluster: rds.DatabaseCluster;
  constructor(scope: Construct, vpcResources: VpcResources, securityGroupResources: SecurityGroupResources) {

    // DBサブネットグループを作成
    const dbSubnetGroup = new rds.SubnetGroup(scope, 'DBSubnetGroup', {
      description: 'DB Subnet Group for Aurora',
      vpc: vpcResources.vpc,
      vpcSubnets: {
        subnets: [vpcResources.subnetDB1a, vpcResources.subnetDB1c],
      },
    });


    // DBクラスターを作成
    this.dbCluster = new rds.DatabaseCluster(scope, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: AuroraMysqlEngineVersion.VER_2_10_0
      }),
      // credentialを自動生成。usernameのみadminを指定
      credentials: {
        username: 'admin',
        secretName: 'dbSecret'
      },
      instances: 1,
      parameterGroup: rds.ParameterGroup.fromParameterGroupName(scope, 'ClusterParameterGroup', 'default.aurora-mysql5.7'),
      instanceProps: {
        vpc: vpcResources.vpc,
        instanceType: ec2.InstanceType.of(InstanceClass.T3, InstanceSize.SMALL),
        publiclyAccessible: false,
        deleteAutomatedBackups: false,
        securityGroups: [securityGroupResources.databaseSg],
        parameterGroup: rds.ParameterGroup.fromParameterGroupName(scope, 'ParameterGroup', 'default.aurora-mysql5.7'),
        vpcSubnets: {
          subnets: [vpcResources.subnetDB1a, vpcResources.subnetDB1c],
        }
      },
      port: 3306,
      defaultDatabaseName: 'bastion',
      subnetGroup: dbSubnetGroup,
      backup: {
        retention: cdk.Duration.days(1)
      },
      storageEncrypted: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

  }
}