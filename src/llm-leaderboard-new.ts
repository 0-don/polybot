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

  // Kill the chromium child when the parent receives SIGTERM/SIGINT so
  // bun service restarts don't leave 1.4 TB-virt chrome procs orphaned on
  // the host. See llm-leaderboard.ts for the full context.
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
