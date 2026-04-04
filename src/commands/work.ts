#!/usr/bin/env bun
/**
 * work - Start working on a GitHub issue
 * 
 * Usage:
 *   bun run work <issue-number>
 *   bun run work 7
 * 
 * What it does:
 *   1. Fetches issue details from GitHub
 *   2. Updates issue with "Starting work..."
 *   3. Shows issue description and acceptance criteria
 *   4. Provides clear next steps
 */

import { execSync } from "child_process";
import pc from "picocolors";

const REPO = "boofpackdev/bunny";
const ISSUE_NUM = parseInt(Bun.argv[2], 10);

if (!ISSUE_NUM || isNaN(ISSUE_NUM)) {
  console.log(pc.red("Usage: bun run work <issue-number>"));
  console.log(pc.dim("Example: bun run work 7"));
  process.exit(1);
}

async function main() {
  console.log(pc.cyan("\n━━━ Loading issue #" + ISSUE_NUM + " ━━━\n"));

  // Fetch issue details
  let issueData: any;
  try {
    const output = execSync(
      `gh issue view ${ISSUE_NUM} --repo ${REPO} --json number,title,body,labels,milestone,state`,
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
    process.exit(0);
  }

  // Extract labels
  const labelNames = (issueData.labels || []).map((l: any) => l.name);
  const isInProgress = labelNames.includes("in progress");

  // Update issue with "Starting..."
  if (!isInProgress) {
    console.log(pc.dim("Updating issue status..."));
    execSync(`gh issue comment ${ISSUE_NUM} --repo ${REPO} -b "🤖 Starting work on this issue..."`, {
      encoding: "utf8",
    });
    execSync(`gh issue edit ${ISSUE_NUM} --repo ${REPO} --add-label "in progress"`, {
      encoding: "utf8",
    });
    console.log(pc.green("✓ Marked as in progress\n"));
  } else {
    console.log(pc.yellow("⚠ Already marked as in progress\n"));
  }

  // Display issue info
  console.log(pc.bold(pc.white("Title:")));
  console.log("  " + issueData.title + "\n");

  if (issueData.milestone) {
    console.log(pc.bold(pc.white("Milestone:")));
    console.log("  " + issueData.milestone.title + "\n");
  }

  if (labelNames.length > 0) {
    console.log(pc.bold(pc.white("Labels:")));
    console.log(
      "  " + labelNames.map((l: string) => pc.dim("[" + l + "]")).join(" ") + "\n"
    );
  }

  // Show body (description)
  if (issueData.body) {
    console.log(pc.bold(pc.white("Description:")));
    console.log(
      "  " +
        issueData.body
          .split("\n")
          .slice(0, 20)
          .join("\n  ") +
        (issueData.body.split("\n").length > 20 ? "\n  " + pc.dim("...") : "") +
        "\n"
    );
  }

  // Show acceptance criteria if present
  const hasAcceptance = issueData.body?.includes("## Acceptance");
  if (hasAcceptance) {
    console.log(pc.bold(pc.white("Acceptance Criteria:")));
    const lines = issueData.body.split("\n");
    let inAcceptance = false;
    for (const line of lines) {
      if (line.includes("## Acceptance")) {
        inAcceptance = true;
        continue;
      }
      if (inAcceptance && line.startsWith("## ")) break;
      if (inAcceptance && line.trim()) {
        const checked = line.includes("[ ]") ? "[ ]" : "[x]";
        const text = line.replace(/^[-*]\s*\[.\]\s*/, "").trim();
        console.log("  " + (line.includes("[ ]") ? pc.dim(checked) : pc.green("✓")) + " " + text);
      }
    }
    console.log();
  }

  // Show checklist
  console.log(pc.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  console.log();
  console.log(pc.bold("NEXT STEPS:"));
  console.log();
  console.log(pc.white("  1.") + pc.dim(" Do the work described above"));
  console.log(pc.white("  2.") + pc.dim(" When done, run:"));
  console.log(pc.dim("     bun run complete " + ISSUE_NUM));
  console.log(pc.white("     (or manually close with comment)"));
  console.log();
  console.log(pc.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
}

main();
