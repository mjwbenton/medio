import { spawn } from "child_process";
import { once } from "events";
import { S3Event, SNSEvent } from "aws-lambda";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { cleanEnv, str } from "envalid";

const { OUTPUT_BUCKET } = cleanEnv(process.env, {
  OUTPUT_BUCKET: str(),
});

const S3 = new S3Client({});

export const handler = async (event: SNSEvent) => {
  const { bucket, key } = extractFromSNSEvent(event);
  const signedUrl = await getSignedUrl(
    S3,
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  const child = spawn(
    `/opt/ffmpeg -y -i ${signedUrl} -vf format=gray,scale=w='if(gt(iw\\,ih)\\,480\\,-2)':h='if(gt(iw\\,ih)\\,-2\\,480)',eq=contrast=1.5 -b:v 1M -b:a 256k -`
  );

  child.on("error", (error) => {
    console.error("Error executing:", error);
  });

  child.stderr.on("data", (data) => {
    console.error("stderr:", data);
  });

  const s3Promise = S3.send(
    new PutObjectCommand({
      Bucket: OUTPUT_BUCKET,
      Key: `${key}.mp4`,
      Body: child.stdout,
    })
  );

  const spawnPromise = once(child, "end");

  await Promise.all([s3Promise, spawnPromise]);
};

function extractFromSNSEvent(event: SNSEvent): { bucket: string; key: string } {
  const parsedEvent: S3Event = JSON.parse(event.Records[0].Sns.Message);
  const {
    object: { key },
    bucket: { name: bucket },
  } = parsedEvent.Records[0].s3;
  return { key, bucket };
}
