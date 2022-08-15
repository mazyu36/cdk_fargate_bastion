import { AuroraResources } from './resources/AuroraResources';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EcrResources } from './resources/EcrResources';
import { SecurityGroupResources } from './resources/SecurityGroupResources';
import { VpcResources } from './resources/vpcResources';
import { BastionEcsResources } from './resources/BastionEcsResources';
import { BastionCodePipelineResources } from './resources/BastionCodepipelineResources';

export class CdkFargateBastionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    const vpcResources = new VpcResources(this);

    const securityGroupResources = new SecurityGroupResources(this, vpcResources);

    const ecrResources = new EcrResources(this);


    const auroraResources = new AuroraResources(this, vpcResources, securityGroupResources);

    const bastionEcsResources = new BastionEcsResources(this, vpcResources, securityGroupResources, ecrResources, auroraResources)

    new BastionCodePipelineResources(this, ecrResources, bastionEcsResources)
  }
}
