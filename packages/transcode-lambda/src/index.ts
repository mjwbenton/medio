import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

export const handler = async (event: any) => {
  const { stdout, stderr } = await execAsync("/opt/ffmpeg -version");
  console.log("stdout:", stdout);
  console.log("stderr:", stderr);
};
