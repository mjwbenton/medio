import { App } from "aws-cdk-lib";
import MedioTranscodeStack from "./MedioTranscodeStack";
import { MedioDataStack } from "./MedioDataStack";

const app = new App();
const dataStack = new MedioDataStack(app, "MedioData");
const transcodeStack = new MedioTranscodeStack(app, "MedioTranscode");
dataStack.subscribeLambdaToNewData(transcodeStack.lambda);
