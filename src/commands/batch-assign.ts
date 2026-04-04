#!/usr/bin/env bun
/**
 * batch-assign - Assign multiple issues to worker droids in parallel
 * 
 * Usage:
 *   bun run batch-assign <issue-number> [issue-number...]
 *   bun run batch-assign 3 4 5 6
 *   bun run batch-assign --milestone M1
 */

import { execSync } from "child_process";
import pc from "picocolors";
import { existsSync, mkdirSync } from "fs";

const REPO = "boofpackdev/bunny";
const LOG_DIR = ".factory/logs/issues";

async function main() {
  const args = Bun.argv.slice(2);
  
  if (args.length === 0) {
    console.log(pc.red("Usage: bun run batch-assign <issue-number> [issue-number...]"));
    console.log(pc.dim("Example: bun run batch-assign 3 4 5 6"));
    console.log(pc.dim("       bun run batch-assign --milestone M1"));
    process.exit(1);
  }

  // Handle --milestone flag
  let issueNumbers: number[] = [];
  
  if (args[0] === "--milestone") {
    const milestone = args[1];
    console.log(pc.cyan(`\n━━━ Fetching issues for milestone: ${milestone} ━━━\n`));
    
    const output = execSync(
      `gh issue list --repo ${REPO} --milestone "${milestone}" --state open --json number --jq ".[].number"`,
      { encoding: "utf8" }
    );
    
    issueNumbers = output.trim().split("\n").map(n => parseInt(n, 10)).filter(n => !isNaN(n));
  } else {
    issueNumbers = args.map(n => parseInt(n, 10)).filter(n => !isNaN(n));
  }

  if (issueNumbers.length === 0) {
    console.log(pc.yellow("No issues found to assign.\n"));
    process.exit(0);
  }

  console.log(pc.cyan(`\n━━━ Assigning ${issueNumbers.length} issues to worker droids ━━━\n`));
  console.log(pc.dim(`Issues: ${issueNumbers.join(", ")}\n`));

  // Spawn workers in parallel
  const workers: Promise<void>[] = [];
  
  for (const issueNum of issueNumbers) {
    workers.push(spawnWorker(issueNum));
  }

  await Promise.all(workers);
  
  console.log(pc.green(`\n✓ All ${issueNumbers.length} workers spawned!\n`));
  console.log(pc.dim("To monitor workers:"));
  console.log(pc.dim("  bun run workers           - show status"));
  console.log(pc.dim("  bun run workers stream    - stream all worker logs"));
  console.log(pc.dim("  bun run workers stream 3  - stream issue #3\n"));
}

async function spawnWorker(issueNum: number): Promise<void> {
  // Fetch issue details
  let issueData: any;
  try {
    const output = execSync(
      `gh issue view ${issueNum} --repo ${REPO} --json number,title,body,state`,
      { encoding: "utf8" }
    );
    issueData = JSON.parse(output);
  } catch {
    console.log(pc.red(`✗ Failed to fetch issue #${issueNum}`));
    return;
  }

  if (issueData.state === "closed") {
    console.log(pc.yellow(`⚠ Issue #${issueNum} is already closed, skipping`));
    return;
  }

  // Update issue
  execSync(
    `gh issue comment ${issueNum} --repo ${REPO} -b "🤖 Worker droid assigned, starting work..."`,
    { encoding: "utf8" }
  );
  execSync(`gh issue edit ${issueNum} --repo ${REPO} --add-label "in progress"`, {
    encoding: "utf8",
  });

  console.log(pc.green(`✓ Assigned #${issueNum}: ${issueData.title}`));

  // Build prompt
  const prompt = `
ISSUE: #${issueNum} - ${issueData.title}
REPO: ${REPO}
ISSUE_URL: https://github.com/${REPO}/issues/${issueNum}

## Issue Description
${issueData.body || "No description provided."}

## Required Workflow

### Before Starting
\`\`\`bash
gh issue comment ${issueNum} --repo ${REPO} -b "Starting work on this issue..."
\`\`\`

### After Completion
\`\`\`bash
gh issue comment ${issueNum} --repo ${REPO} -b "Completed: [describe what was done]"
gh issue close ${issueNum} --repo ${REPO}
\`\`\`

## Task

1. Read the issue description above
2. Implement the required changes in the openclaude fork
3. Follow the workflow above
4. Push changes to the repository

Read the full issue at: https://github.com/${REPO}/issues/${issueNum}
`.trim();

  // Ensure log directory exists
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
  const logFile = `${LOG_DIR}/issue-${issueNum}.log`;

  // Spawn worker with output going to log file
  try {
    console.log(pc.dim(`  → Logging to: ${logFile}`));
    
    const droidProcess = Bun.spawn(
      ["droid", "exec", "--auto=medium", `--use-subagent=hermes-issue-worker`, prompt],
      {
        stdout: Bun.file(logFile),
        stderr: Bun.file(logFile),
      }
    );
    
    // Don't wait - let it run in background
    // But we could track it if needed
  } catch (e: any) {
    console.log(pc.red(`✗ Failed to spawn worker for #${issueNum}: ${e.message}`));
  }
}

main();
