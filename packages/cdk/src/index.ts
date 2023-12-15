import { App } from "aws-cdk-lib";
import MedioTranscodeStack from "./MedioTranscodeStack";

const app = new App();
new MedioTranscodeStack(app, "MedioTranscode");
