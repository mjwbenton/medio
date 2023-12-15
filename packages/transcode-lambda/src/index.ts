import { spawnSync } from "child_process";
import { APIGatewayEvent, S3Event, SNSEvent } from "aws-lambda";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { cleanEnv, str } from "envalid";
import * as fs from "fs";
import { Upload } from "@aws-sdk/lib-storage";

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

  console.log(`Spawning ffmpeg with signed url: ${signedUrl}`);

  const child = spawnSync(
    "/opt/ffmpeg",
    [
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
    ],
    {
      stdio: "inherit",
    }
  );

  console.log("Transcode complete, uploading to S3");

  const upload = new Upload({
    client: S3,
    params: {
      Bucket: OUTPUT_BUCKET,
      Key: `${key}.mp4`,
      Body: fs.createReadStream(TEMP_FILE),
    },
  });

  upload.on("httpUploadProgress", (progress) => {
    console.log(`Upload progress: ${progress}`);
  });

  await upload.done();

  console.log("Upload complete");
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
