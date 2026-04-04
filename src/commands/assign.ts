#!/usr/bin/env bun
/**
 * assign - Assign an issue and spawn a worker droid to work on it
 * 
 * Usage:
 *   bun run assign <issue-number>
 *   bun run assign 7
 * 
 * What it does:
 *   1. Fetches issue details from GitHub
 *   2. Updates issue with "Assigned and starting work..."
 *   3. Generates task prompt from issue
 *   4. Spawns a worker droid via: droid exec "<prompt>"
 */

import { execSync } from "child_process";
import pc from "picocolors";

const REPO = "boofpackdev/bunny";
const ISSUE_NUM = parseInt(Bun.argv[2], 10);

if (!ISSUE_NUM || isNaN(ISSUE_NUM)) {
  console.log(pc.red("Usage: bun run assign <issue-number>"));
  console.log(pc.dim("Example: bun run assign 7"));
  process.exit(1);
}

async function main() {
  console.log(pc.cyan("\n━━━ Assigning issue #" + ISSUE_NUM + " ━━━\n"));

  // Fetch issue details
  let issueData: any;
  try {
    const output = execSync(
      `gh issue view ${ISSUE_NUM} --repo ${REPO} --json number,title,body,labels,state`,
      { encoding: "utf8" }
    );
    issueData = JSON.parse(output);
  } catch (e: any) {
    console.log(pc.red("Error: Could not fetch issue #" + ISSUE_NUM));
    console.log(pc.dim(e.message || "Issue not found or access denied"));
    process.exit(1);
  }

  if (issueData.state === "closed") {
    console.log(pc.yellow("⚠ Issue #" + ISSUE_NUM + " is already closed\n"));
    process.exit(1);
  }

  // Update issue
  console.log(pc.dim("Updating issue status..."));
  execSync(
    `gh issue comment ${ISSUE_NUM} --repo ${REPO} -b "🤖 Assigned and starting work on this issue..."`,
    { encoding: "utf8" }
  );
  execSync(`gh issue edit ${ISSUE_NUM} --repo ${REPO} --add-label "in progress"`, {
    encoding: "utf8",
  });
  console.log(pc.green("✓ Assigned and marked as in progress\n"));

  // Generate task prompt inline
  const title = issueData.title;
  const body = issueData.body || "";
  const prompt = `
ISSUE: #${ISSUE_NUM} - ${title}
REPO: ${REPO}
ISSUE_URL: https://github.com/${REPO}/issues/${ISSUE_NUM}

## Issue Description
${body}

## Required Workflow

You MUST update the GitHub issue at each stage:

### Before Starting
\`\`\`bash
gh issue comment ${ISSUE_NUM} --repo ${REPO} -b "Starting work on this issue..."
\`\`\`

### After Completion
\`\`\`bash
gh issue comment ${ISSUE_NUM} --repo ${REPO} -b "Completed: [describe what was done]"
gh issue close ${ISSUE_NUM} --repo ${REPO}
\`\`\`

## Task

1. Read the issue description above
2. Implement the changes
3. Follow the update workflow above

Read the full issue at: https://github.com/${REPO}/issues/${ISSUE_NUM}
`.trim();

  // Display what we're about to do
  console.log(pc.bold(pc.white("Spawning worker droid...")));
  console.log(pc.dim("Issue: #" + ISSUE_NUM + " - " + title));
  console.log();

  // Spawn the droid
  console.log(pc.cyan("Running: droid exec --auto=medium\n"));

  try {
    // Spawn droid exec with medium auto-approval
    const droidProcess = Bun.spawn(["droid", "exec", "--auto=medium", prompt], {
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
    });

    // Wait for droid to complete
    const exitCode = await droidProcess.exited;
    
    if (exitCode === 0) {
      console.log(pc.green("\n✓ Droid completed successfully"));
      console.log(pc.dim("Remember to mark the issue complete:"));
      console.log(pc.dim("  bun run complete " + ISSUE_NUM));
    } else {
      console.log(pc.yellow("\n⚠ Droid exited with code: " + exitCode));
    }
  } catch (e: any) {
    console.log(pc.red("\n⚠ Could not spawn droid: " + e.message));
    console.log(pc.dim("\nTo spawn manually, run:"));
    console.log(pc.dim("droid exec --auto=medium '<task-prompt>'"));
  }
}

main();
