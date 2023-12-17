import { App } from "aws-cdk-lib";
import MedioTranscodeStack from "./MedioTranscodeStack";
import { MedioDataStack } from "./MedioDataStack";
import { MedioCdnStack } from "./MedioCdnStack";
import MedioGraphqlStack from "./MedioGraphqlStack";
import { MedioUploadUserStack } from "./MedioUploadUserStack";

const app = new App();
const dataStack = new MedioDataStack(app, "MedioData");
new MedioUploadUserStack(app, "MedioUpload", {
  bucket: dataStack.sourceDataBucket,
});
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
