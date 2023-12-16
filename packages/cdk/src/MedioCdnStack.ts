import { Stack } from "aws-cdk-lib";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import {
  CloudFrontWebDistribution,
  OriginAccessIdentity,
} from "aws-cdk-lib/aws-cloudfront";
import { Bucket } from "aws-cdk-lib/aws-s3";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";
import { ARecord, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { HostedZone } from "aws-cdk-lib/aws-route53";

const HOSTED_ZONE = "mattb.tech";
const HOSTED_ZONE_ID = "Z2GPSB1CDK86DH";
const DOMAIN_NAME = "recordings.medio.mattb.tech";

export class MedioCdnStack extends Stack {
  constructor(scope: Construct, id: string, { bucket }: { bucket: IBucket }) {
    super(scope, id);

    const zone = HostedZone.fromHostedZoneAttributes(this, "Zone", {
      hostedZoneId: HOSTED_ZONE_ID,
      zoneName: HOSTED_ZONE,
    });

    const certificate = new Certificate(this, "Certificate", {
      domainName: DOMAIN_NAME,
      validation: CertificateValidation.fromDns(zone),
    });

    const originAccessIdentity = new OriginAccessIdentity(this, "OAI");
    bucket.grantRead(originAccessIdentity);

    const distribution = new CloudFrontWebDistribution(this, "Distribution", {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: bucket,
            originAccessIdentity,
          },
          behaviors: [{ isDefaultBehavior: true }],
        },
      ],
      viewerCertificate: {
        aliases: [DOMAIN_NAME],
        props: {
          acmCertificateArn: certificate.certificateArn,
          sslSupportMethod: "sni-only",
        },
      },
    });

    new ARecord(this, "AliasRecord", {
      zone,
      recordName: DOMAIN_NAME,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });
  }
}
