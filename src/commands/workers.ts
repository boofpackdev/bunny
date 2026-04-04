#!/usr/bin/env bun
/**
 * workers - Show active worker droids and stream their output
 * 
 * Usage:
 *   bun run workers           - Show status of all workers
 *   bun run workers stream    - Stream output from all workers
 *   bun run workers stream 3 - Stream output from worker on issue #3
 */

import { execSync } from "child_process";
import pc from "picocolors";
import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";

const REPO = "boofpackdev/bunny";
const LOG_DIR = ".factory/logs/issues";

async function main() {
  const args = Bun.argv.slice(2);
  const cmd = args[0] || "status";

  if (cmd === "stream") {
    const issueNum = args[1];
    if (issueNum) {
      await streamWorker(issueNum);
    } else {
      await streamAll();
    }
  } else {
    await showStatus();
  }
}

async function showStatus() {
  console.log(pc.cyan("\n━━━ Active Workers ━━━\n"));

  let issues: any[] = [];
  try {
    const output = execSync(
      `gh issue list --repo ${REPO} --label "in progress" --state open --json number,title,updatedAt,labels`,
      { encoding: "utf8" }
    );
    issues = JSON.parse(output);
  } catch {
    console.log(pc.dim("No active workers found."));
    return;
  }

  if (issues.length === 0) {
    console.log(pc.dim("No issues currently being worked on.\n"));
    return;
  }

  console.log(pc.bold(pc.white("Issue")), pc.dim(" | Status"), pc.dim(" | Last Updated"));
  console.log(pc.dim("──────" + "─".repeat(40) + "─" + "────────" + "─".repeat(12) + "─────────────"));
  
  for (const issue of issues) {
    const updated = new Date(issue.updatedAt).toLocaleTimeString();
    const hasLog = existsSync(join(LOG_DIR, `issue-${issue.number}.log`));
    const status = hasLog ? pc.green("● working") : pc.yellow("◐ starting");
    
    console.log(
      pc.green("#" + issue.number) + 
      pc.dim(" - " + issue.title.slice(0, 38)) +
      pc.dim(" | " + status) +
      pc.dim(" | " + updated)
    );
  }
  
  console.log(pc.dim("\nTo stream output:"));
  console.log(pc.dim("  bun run workers stream      - stream all worker logs"));
  console.log(pc.dim("  bun run workers stream 3   - stream issue #3\n"));
}

async function streamAll() {
  console.log(pc.cyan("\n━━━ Streaming All Workers ━━━\n"));
  console.log(pc.dim("(Ctrl+C to stop, refreshing every 2s)\n"));

  let issues: any[] = [];
  try {
    const output = execSync(
      `gh issue list --repo ${REPO} --label "in progress" --state open --json number,title`,
      { encoding: "utf8" }
    );
    issues = JSON.parse(output);
  } catch {
    console.log(pc.red("Failed to fetch issues"));
    return;
  }

  if (issues.length === 0) {
    console.log(pc.yellow("No active workers.\n"));
    return;
  }

  // Keep refreshing display
  let running = true;
  
  const showLogs = () => {
    console.clear();
    console.log(pc.cyan("\n━━━ Worker Output ━━━\n"));
    
    for (const issue of issues) {
      const logPath = join(LOG_DIR, `issue-${issue.number}.log`);
      console.log(pc.bold(pc.white(`\n━━ #${issue.number}: ${issue.title.slice(0, 45)} ━`)));
      
      if (existsSync(logPath)) {
        const content = readFileSync(logPath, "utf8");
        const lines = content.split("\n").slice(-15);
        for (const line of lines) {
          if (line.trim()) console.log(pc.dim(line.slice(0, 120)));
        }
      } else {
        console.log(pc.dim("  (waiting for output...)"));
      }
    }
    console.log(pc.dim("\n  Refreshing...\n"));
  };

  // Handle Ctrl+C
  process.on("SIGINT", () => {
    running = false;
    console.log(pc.dim("\n\nStopped streaming.\n"));
    process.exit(0);
  });

  // Refresh every 2 seconds
  while (running) {
    showLogs();
    await new Promise(r => setTimeout(r, 2000));
  }
}

async function streamWorker(issueNum: string) {
  console.log(pc.cyan(`\n━━━ Streaming Issue #${issueNum} ━━━\n`));
  console.log(pc.dim("(Ctrl+C to stop, refreshing every 1s)\n"));

  const logPath = join(LOG_DIR, `issue-${issueNum}.log`);
  
  if (!existsSync(logPath)) {
    console.log(pc.yellow(`No log found for issue #${issueNum}`));
    console.log(pc.dim("Worker may not have started yet.\n"));
    return;
  }

  let lastMtime = statSync(logPath).mtimeMs;
  
  let running = true;
  
  const showLog = () => {
    const content = readFileSync(logPath, "utf8");
    console.clear();
    console.log(pc.cyan(`━━━ Issue #${issueNum} ━━━\n`));
    
    const lines = content.split("\n");
    const recentLines = lines.slice(-100);
    for (const line of recentLines) {
      if (line.trim()) console.log(pc.dim(line.slice(0, 120)));
    }
    console.log(pc.dim("\n  Refreshing...\n"));
  };

  // Handle Ctrl+C
  process.on("SIGINT", () => {
    running = false;
    console.log(pc.dim("\n\nStopped streaming.\n"));
    process.exit(0);
  });

  // Refresh every second
  while (running) {
    const mtime = statSync(logPath).mtimeMs;
    if (mtime !== lastMtime) {
      lastMtime = mtime;
      showLog();
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

main();
