import { Duration, Stack } from "aws-cdk-lib";
import {
  Architecture,
  Code,
  FunctionUrlAuthType,
  IFunction,
  LayerVersion,
  Runtime,
} from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";

export default class MedioTranscodeStack extends Stack {
  lambda: IFunction;

  constructor(
    scope: Construct,
    id: string,
    { outputBucket }: { outputBucket: string }
  ) {
    super(scope, id);

    const ffmpegLayer = new LayerVersion(this, "FfmpegLayer", {
      code: Code.fromAsset(path.join(__dirname, "../../ffmpeg-layer/dist")),
      compatibleArchitectures: [Architecture.ARM_64],
    });

    this.lambda = new NodejsFunction(this, "TranscodeFunction", {
      layers: [ffmpegLayer],
      entry: path.join(__dirname, "../../transcode-lambda/dist/index.js"),
      handler: "handler",
      bundling: {
        target: "es2021",
        environment: {
          NODE_ENV: "production",
        },
      },
      architecture: Architecture.ARM_64,
      timeout: Duration.minutes(2),
      runtime: Runtime.NODEJS_18_X,
      memorySize: 3072,
      environment: {
        OUTPUT_BUCKET: outputBucket,
      },
    });

    this.lambda.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
    });
  }
}
