import { spawn } from "child_process";
import { once } from "events";
import { APIGatewayEvent, S3Event, SNSEvent } from "aws-lambda";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { cleanEnv, str } from "envalid";
import * as fs from "fs";

const { OUTPUT_BUCKET } = cleanEnv(process.env, {
  OUTPUT_BUCKET: str(),
});

const TEMP_FILE = "/tmp/temp.mp4";

const S3 = new S3Client({});

export const handler = async (event: SNSEvent | APIGatewayEvent) => {
  const { bucket, key } = isSNSEvent(event)
    ? extractFromSNSEvent(event)
    : extractFromAPIEvent(event);
  const signedUrl = await getSignedUrl(
    S3,
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  const child = spawn("/opt/ffmpeg", [
    "-y",
    "-hide_banner",
    "-i",
    signedUrl,
    "-vf",
    "format=gray,scale=w='if(gt(iw\\,ih)\\,480\\,-2)':h='if(gt(iw\\,ih)\\,-2\\,480)',eq=contrast=1.5",
    "-b:v",
    "1M",
    "-b:a",
    "256k",
    TEMP_FILE,
  ]);

  child.on("error", (error) => {
    console.error("Error executing:", error);
  });

  child.stderr.on("data", (data) => {
    console.error("stderr:", data.toString("utf-8"));
  });

  await once(child, "end");

  await S3.send(
    new PutObjectCommand({
      Bucket: OUTPUT_BUCKET,
      Key: `${key}.mp4`,
      Body: fs.createReadStream(TEMP_FILE),
    })
  );
};

function isSNSEvent(e: SNSEvent | APIGatewayEvent): e is SNSEvent {
  return "Records" in e;
}

function extractFromSNSEvent(event: SNSEvent): { bucket: string; key: string } {
  const parsedEvent: S3Event = JSON.parse(event.Records[0].Sns.Message);
  const {
    object: { key },
    bucket: { name: bucket },
  } = parsedEvent.Records[0].s3;
  return { key, bucket };
}

function extractFromAPIEvent(event: APIGatewayEvent): {
  bucket: string;
  key: string;
} {
  const { bucket, key } = event.queryStringParameters ?? {};
  if (!bucket || !key) {
    throw new Error("Invalid bucket and key in API event");
  }
  return { bucket, key };
}
