export function getBuildSpecConfig(repositoryName: string) {

    const buildSpecConfig = {
        version: 0.2,
        env: {
            variables: {
                'AWS_REGION_NAME': 'ap-northeast-1',
                'ECR_REPOSITORY_NAME': `${repositoryName}`,
            }
        },
        phases: {
            pre_build: {
                commands: [
                    'AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query \'Account\' --output text)',
                    'aws ecr --region ap-northeast-1 get-login-password | docker login --username AWS --password-stdin https://${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION_NAME}.amazonaws.com/${ECR_REPOSITORY_NAME}',
                    'REPOSITORY_URI=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION_NAME}.amazonaws.com/${ECR_REPOSITORY_NAME}',
                    '# Use Git Commit hash for image tag',
                    'IMAGE_TAG=$(echo ${CODEBUILD_RESOLVED_SOURCE_VERSION})',
                ]
            },
            build: {
                commands: [
                    'docker image build -t ${REPOSITORY_URI}:${IMAGE_TAG} -t ${REPOSITORY_URI}:latest .'
                ]
            },
            post_build: {
                commands: [
                    'echo Build completed on $(date)',
                    'docker image push ${REPOSITORY_URI}:${IMAGE_TAG}',
                    'docker image push ${REPOSITORY_URI}:latest',
                    'printf \'[{"name":"%s","imageUri":"%s"}]\' $ECR_REPOSITORY_NAME $REPOSITORY_URI:$IMAGE_TAG > imagedefinitions.json',
                ]
            }
        },
        artifacts: {
            files: [
                'imagedefinitions.json',
            ]
        }


    }
    return buildSpecConfig;

}