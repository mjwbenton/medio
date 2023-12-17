import { CfnOutput, SecretValue, Stack } from "aws-cdk-lib";
import { AccessKey, User } from "aws-cdk-lib/aws-iam";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export class MedioUploadUserStack extends Stack {
  constructor(scope: Construct, id: string, { bucket }: { bucket: IBucket }) {
    super(scope, id);

    const uploadUser = new User(this, "UploadUser");
    bucket.grantReadWrite(uploadUser);
    const accessKey = new AccessKey(this, "UploadUserAccessKey", {
      user: uploadUser,
    });
    const secret = new Secret(this, "UploadUserAccessKeySecret", {
      secretObjectValue: {
        accessKeyId: SecretValue.unsafePlainText(accessKey.accessKeyId),
        secretAccessKey: accessKey.secretAccessKey,
      },
    });
    new CfnOutput(this, "UploadUserAccessKeySecretArn", {
      value: secret.secretArn,
    });
  }
}
