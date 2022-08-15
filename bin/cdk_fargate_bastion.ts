#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkFargateBastionStack } from '../lib/fargateBastionStack';

const app = new cdk.App();
new CdkFargateBastionStack(app, 'CdkFargateBastionStack', {
});