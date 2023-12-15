import { Stack } from "aws-cdk-lib";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Bucket, EventType, IBucket } from "aws-cdk-lib/aws-s3";
import { SnsDestination } from "aws-cdk-lib/aws-s3-notifications";
import { ITopic, Topic } from "aws-cdk-lib/aws-sns";
import { LambdaSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";

export class MedioDataStack extends Stack {
  public readonly sourceDataBucket: IBucket;
  private readonly newDataTopic: ITopic;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.sourceDataBucket = new Bucket(this, "Bucket");
    this.newDataTopic = new Topic(this, "NewDataTopic");
    this.sourceDataBucket.addEventNotification(
      EventType.OBJECT_CREATED,
      new SnsDestination(this.newDataTopic)
    );
  }

  public subscribeLambdaToNewData(fn: IFunction) {
    this.newDataTopic.addSubscription(new LambdaSubscription(fn));
    this.sourceDataBucket.grantRead(fn);
  }
}
