#!/usr/bin/env bun
/**
 * complete - Mark a GitHub issue as complete
 * 
 * Usage:
 *   bun run complete <issue-number> [notes...]
 *   bun run complete 7
 *   bun run complete 7 "Implemented Hermes provider with streaming"
 */

import { execSync } from "child_process";
import pc from "picocolors";

const REPO = "boofpackdev/bunny";
const ISSUE_NUM = parseInt(Bun.argv[2], 10);
const NOTES = Bun.argv.slice(3).join(" ") || "Completed";

if (!ISSUE_NUM || isNaN(ISSUE_NUM)) {
  console.log(pc.red("Usage: bun run complete <issue-number> [notes...]"));
  console.log(pc.dim("Example: bun run complete 7 \"Implemented the thing\""));
  process.exit(1);
}

async function main() {
  console.log(pc.cyan("\n━━━ Completing issue #" + ISSUE_NUM + " ━━━\n"));

  // Fetch issue to verify
  let issueData: any;
  try {
    const output = execSync(
      `gh issue view ${ISSUE_NUM} --repo ${REPO} --json number,title,state`,
      { encoding: "utf8" }
    );
    issueData = JSON.parse(output);
  } catch (e: any) {
    console.log(pc.red("Error: Could not fetch issue #" + ISSUE_NUM));
    process.exit(1);
  }

  if (issueData.state === "closed") {
    console.log(pc.yellow("⚠ Issue #" + ISSUE_NUM + " is already closed\n"));
    process.exit(0);
  }

  console.log(pc.dim("Title: " + issueData.title));
  console.log();

  // Comment with completion
  console.log(pc.dim("Posting completion comment..."));
  const comment = `✅ Completed: ${NOTES}`;
  execSync(`gh issue comment ${ISSUE_NUM} --repo ${REPO} -b "${comment}"`, {
    encoding: "utf8",
  });
  console.log(pc.green("✓ Comment posted"));

  // Close issue
  console.log(pc.dim("Closing issue..."));
  execSync(`gh issue close ${ISSUE_NUM} --repo ${REPO}`, {
    encoding: "utf8",
  });
  console.log(pc.green("✓ Issue closed\n"));
}

main();
