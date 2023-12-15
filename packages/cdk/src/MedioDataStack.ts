import { Stack } from "aws-cdk-lib";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Bucket, EventType, IBucket } from "aws-cdk-lib/aws-s3";
import { SnsDestination } from "aws-cdk-lib/aws-s3-notifications";
import { ITopic, Topic } from "aws-cdk-lib/aws-sns";
import { LambdaSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";

export class MedioDataStack extends Stack {
  public readonly sourceDataBucket: IBucket;
  public readonly outputDataBucket: IBucket;
  private readonly newSourceDataTopic: ITopic;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.sourceDataBucket = new Bucket(this, "SourceBucket");
    this.outputDataBucket = new Bucket(this, "OutputBucket");
    this.newSourceDataTopic = new Topic(this, "NewSourceDataTopic");
    this.sourceDataBucket.addEventNotification(
      EventType.OBJECT_CREATED,
      new SnsDestination(this.newSourceDataTopic)
    );
  }

  public subscribeLambdaToSourceData(fn: IFunction) {
    this.newSourceDataTopic.addSubscription(new LambdaSubscription(fn));
    this.sourceDataBucket.grantRead(fn);
  }
}
