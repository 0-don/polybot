import "@dotenvx/dotenvx/config";
import { execSync } from "child_process";
import { error, log } from "console";
import { connect } from "puppeteer-real-browser";
import { llmArenaNew } from "./puppeteer/llmArena";
import { isRunningInDocker } from "./utils";

const main = async () => {
  try {
    if (isRunningInDocker()) {
      execSync("rm -rf /tmp/lighthouse.* /tmp/puppeteer* 2>/dev/null", {
        timeout: 60000,
      });
      log("Cleaned up temp folders on startup");
    }
  } catch {}

  const { page, browser } = await connect({
    turnstile: true,
    connectOption: { defaultViewport: null },
  });

  // Kill the chromium child when the parent receives SIGTERM/SIGINT. Without
  // this, killing the bun service via VPN-restart leaves headless chrome
  // procs alive with 1.4 TB virtual mem each, which competes with other
  // workloads on the host (notably the docker buildkitd build of
  // comfyui-models that OOM'd on 2026-05-12). puppeteer-real-browser exposes
  // the underlying Browser instance so we can close it explicitly.
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`Received ${signal}, closing browser...`);
    try {
      await browser.close();
    } catch (e) {
      error("browser.close() failed:", e);
    }
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  try {
    await llmArenaNew(
      page,
      "https://arena.ai/leaderboard/text/overall-no-style-control",
    );
  } finally {
    // Always close on natural exit too so chrome doesn't leak when the
    // scrape finishes successfully.
    try {
      await browser.close();
    } catch (e) {
      error("browser.close() failed on finally:", e);
    }
  }
};

main().catch((err) => {
  error(err);
  process.exit(1);
});
