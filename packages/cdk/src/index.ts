import { App } from "aws-cdk-lib";
import MedioTranscodeStack from "./MedioTranscodeStack";
import { MedioDataStack } from "./MedioDataStack";
import { MedioCdnStack } from "./MedioCdnStack";
import MedioGraphqlStack from "./MedioGraphqlStack";

const app = new App();
const dataStack = new MedioDataStack(app, "MedioData");
const transcodeStack = new MedioTranscodeStack(app, "MedioTranscode", {
  outputBucket: dataStack.outputDataBucket.bucketName,
});
dataStack.outputDataBucket.grantWrite(transcodeStack.lambda);
dataStack.subscribeLambdaToSourceData(transcodeStack.lambda);
new MedioCdnStack(app, "MedioCdn", {
  bucket: dataStack.outputDataBucket,
});
new MedioGraphqlStack(app, "MedioGraphql", {
  bucket: dataStack.outputDataBucket,
});
