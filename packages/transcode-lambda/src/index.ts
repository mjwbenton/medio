import { spawnSync, execSync } from "child_process";
import { APIGatewayEvent, S3Event, SNSEvent } from "aws-lambda";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { cleanEnv, str } from "envalid";
import * as fs from "fs";
import { Upload } from "@aws-sdk/lib-storage";
import { file } from "tmp-promise";
import { Readable } from "stream";
import { finished } from "stream/promises";

const { OUTPUT_BUCKET } = cleanEnv(process.env, {
  OUTPUT_BUCKET: str(),
});

const S3 = new S3Client({});

export const handler = async (event: SNSEvent | APIGatewayEvent) => {
  const { bucket, key } = isSNSEvent(event)
    ? extractFromSNSEvent(event)
    : extractFromAPIEvent(event);

  const { path: sourceFile } = await file();
  await downloadSourceFile({ bucket, key, path: sourceFile });

  const { path: outFile } = await file({ postfix: ".mp4" });

  spawnSync(
    "/opt/ffmpeg",
    [
      "-y",
      "-hide_banner",
      "-i",
      sourceFile,
      "-vf",
      "format=gray,scale=w='if(gt(iw\\,ih)\\,480\\,-2)':h='if(gt(iw\\,ih)\\,-2\\,480)',eq=contrast=1.5",
      "-b:v",
      "1M",
      "-b:a",
      "256k",
      outFile,
    ],
    {
      stdio: "inherit",
    },
  );

  console.log("Transcode complete, uploading to S3");

  execSync(`ls -lh ${outFile}`, { stdio: "inherit" });

  const upload = new Upload({
    client: S3,
    params: {
      Bucket: OUTPUT_BUCKET,
      Key: `${key}.mp4`,
      Body: fs.createReadStream(outFile),
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

async function downloadSourceFile({
  bucket,
  key,
  path,
}: {
  bucket: string;
  key: string;
  path: string;
}) {
  const { Body: sourceFileBody } = await S3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );

  if (!sourceFileBody || !(sourceFileBody instanceof Readable)) {
    throw new Error("Invalid source file body");
  }

  const sourceFileStream = fs.createWriteStream(path);
  sourceFileBody.pipe(sourceFileStream);
  await finished(sourceFileStream);
}
