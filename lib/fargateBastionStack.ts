import { AthenaConstruct } from './constructs/AthenaConstruct';
import { AuroraConstruct } from './constructs/AuroraConstruct';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EcrConstruct } from './constructs/EcrConstruct';
import { SecurityGroupConstruct } from './constructs/SecurityGroupConstruct';
import { VpcConstruct } from './constructs/vpcConstruct';
import { BastionEcsConstruct } from './constructs/BastionEcsConstruct';
import { BastionCodePipelineConstruct } from './constructs/BastionCodepipelineConstruct';

export class CdkFargateBastionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    const vpcConstruct = new VpcConstruct(this, 'VpcConstruct', {});

    const securityGroupConstruct = new SecurityGroupConstruct(this, 'SecurityGroupConstruct', { vpcConstruct });

    const auroraConstruct = new AuroraConstruct(this, 'AuroraConstruct', { vpcConstruct, securityGroupConstruct });

    new AthenaConstruct(this, 'AthenaConstruct', { vpcConstruct, securityGroupConstruct, auroraConstruct })

    const ecrConstruct = new EcrConstruct(this, 'EcrConstruct', { vpcConstruct, securityGroupConstruct });

    const bastionEcsConstruct = new BastionEcsConstruct(this, 'BastionEcsConstruct', { vpcConstruct, securityGroupConstruct, ecrConstruct, auroraConstruct })

    new BastionCodePipelineConstruct(this, 'BastionCodePipelineConstruct', { ecrConstruct, bastionEcsConstruct })
  }
}
