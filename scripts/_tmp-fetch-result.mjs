import { fal } from "@fal-ai/client";
fal.config({ credentials: process.env.FAL_KEY });
async function main() {
  try {
    const status = await fal.queue.status("fal-ai/kling-video/v2.6/standard/motion-control", { requestId: "01a07827-8239-74f0-b7f1-0b5e1bc5c8eb", logs: true });
    console.log("STATUS:", JSON.stringify(status, null, 2));
  } catch (e) {
    console.error("status err:", e?.message, JSON.stringify(e?.body));
  }
  try {
    const result = await fal.queue.result("fal-ai/kling-video/v2.6/standard/motion-control", { requestId: "01a07827-8239-74f0-b7f1-0b5e1bc5c8eb" });
    console.log("RESULT:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("result err:", e?.message, JSON.stringify(e?.body, null, 2));
  }
}
main();
