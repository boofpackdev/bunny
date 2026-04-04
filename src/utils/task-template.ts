/**
 * Task Template Generator for Hermes Frontend Integration
 * 
 * Generates standardized task prompts that include GitHub issue
 * update workflows. Any droid can use these templates -
 * the issue awareness is in the prompt, not the droid.
 */

export interface IssueContext {
  /** GitHub issue number (e.g., 7) */
  number: number;
  /** Short title for the task */
  title: string;
  /** Full issue description (optional, for complex tasks) */
  description?: string;
  /** Working directory relative to repo root */
  cwd?: string;
  /** Any additional instructions */
  extraInstructions?: string;
}

export interface TaskTemplate {
  /** The complete prompt to pass to a droid */
  prompt: string;
  /** Metadata about this template */
  meta: {
    issue: number;
    issueUrl: string;
    repo: string;
    updateWorkflow: string[];
  };
}

/**
 * Generate a complete task prompt with issue update workflow
 */
export function generateTaskPrompt(ctx: IssueContext): TaskTemplate {
  const { number, title, description, cwd, extraInstructions } = ctx;
  const repo = "boofpackdev/bunny";
  const issueUrl = `https://github.com/${repo}/issues/${number}`;

  const updateWorkflow = [
    `gh issue comment ${number} --repo ${repo} -m "Starting work..."`,
    `// ... do actual work ...`,
    `gh issue comment ${number} --repo ${repo} -m "Completed: [summary]"`,
    `gh issue close ${number} --repo ${repo}`,
  ];

  const prompt = `
ISSUE: #${number} - ${title}
REPO: ${repo}
ISSUE_URL: ${issueUrl}
WORKING_DIR: ${cwd ?? "openclaude"}

${description ? `## Issue Description\n${description}\n` : ""}
## Required Workflow

You MUST update the GitHub issue at each stage:

### Before Starting
\`\`\`bash
gh issue comment ${number} --repo ${repo} -m "Starting work on this issue..."
gh issue edit ${number} --repo ${repo} --add-label "in progress"
\`\`\`

### During Work
Post progress updates as comments when significant changes are made.

### After Completion
\`\`\`bash
gh issue comment ${number} --repo ${repo} -m "Completed: [describe what was done]"
gh issue close ${number} --repo ${repo}
\`\`\`

### If Blocked
\`\`\`bash
gh issue comment ${number} --repo ${repo} -m "Blocked by: [reason]"
gh issue edit ${number} --repo ${repo} --add-label "blocked"
\`\`\`

${extraInstructions ? `## Additional Instructions\n${extraInstructions}\n` : ""}
## Task

1. Clone/open the repository: https://github.com/${repo}
2. Navigate to: ${cwd ?? "openclaude"}
3. Implement the changes for issue #${number}
4. Follow the update workflow above

Read the full issue at: ${issueUrl}
`.trim();

  return {
    prompt,
    meta: {
      issue: number,
      issueUrl,
      repo,
      updateWorkflow,
    },
  };
}

/**
 * Generate a code review task prompt
 */
export function generateReviewPrompt(
  issue: IssueContext,
  filesToReview: string[],
  prNumber?: number
): TaskTemplate {
  const { number, title, extraInstructions } = issue;
  const repo = "boofpackdev/bunny";

  const prompt = `
REVIEW ISSUE: #${number} - ${title}
REPO: ${repo}
ISSUE_URL: https://github.com/${repo}/issues/${number}
${prNumber ? `PR: #${prNumber} (https://github.com/${repo}/pull/${prNumber})` : ""}

## Review Workflow

### Before Review
\`\`\`bash
gh issue comment ${number} --repo ${repo} -m "Starting review..."
\`\`\`

### After Review
\`\`\`bash
# If approved:
gh issue comment ${number} --repo ${repo} -m "LGTM! Approved. [optional notes]"
gh issue close ${number} --repo ${repo}

# If changes needed:
gh issue comment ${number} --repo ${repo} -m "Changes needed: [list issues found]"
gh issue edit ${number} --repo ${repo} --add-label "needs-changes"
\`\`\`

## Files to Review
${filesToReview.map((f) => `- ${f}`).join("\n")}

## Review Criteria

- [ ] Code correctness
- [ ] TypeScript types are correct
- [ ] Error handling is proper
- [ ] No security issues
- [ ] Follows existing code style
- [ ] Tests pass (if applicable)

${extraInstructions ? `\n## Additional Instructions\n${extraInstructions}\n` : ""}

Read the full issue at: https://github.com/${repo}/issues/${number}
`.trim();

  return {
    prompt,
    meta: {
      issue: number,
      issueUrl: `https://github.com/${repo}/issues/${number}`,
      repo,
      updateWorkflow: [
        `gh issue comment ${number} --repo ${repo} -m "Starting review..."`,
        `// review files`,
        `gh issue comment ${number} --repo ${repo} -m "Review findings: ..."`,
        `gh issue close ${number} --repo ${repo}  # or label "needs-changes"`,
      ],
    },
  };
}

/**
 * Generate a batch task prompt for multiple issues
 */
export function generateBatchPrompt(issues: IssueContext[]): TaskTemplate {
  const issueList = issues
    .map((i) => `- #${i.number}: ${i.title}`)
    .join("\n");

  const issueUpdates = issues
    .map(
      (i) =>
        `### Issue #${i.number}\n` +
        `Before: gh issue comment ${i.number} --repo boofpackdev/bunny -m "Starting..."\n` +
        `After: gh issue close ${i.number} --repo boofpackdev/bunny`
    )
    .join("\n\n");

  const prompt = `
BATCH TASK: Multiple Issues
REPO: boofpackdev/bunny

## Issues to Work On
${issueList}

## Workflow for Each Issue

${issueUpdates}

## Instructions

1. Start with the first issue
2. Follow the workflow for each
3. Work through all issues in order
4. Update each issue before moving to the next

Read issues at: https://github.com/boofpackdev/bunny/issues
`.trim();

  return {
    prompt,
    meta: {
      issue: issues[0].number, // Primary issue for reference
      issueUrl: `https://github.com/boofpackdev/bunny/issues/${issues[0].number}`,
      repo: "boofpackdev/bunny",
      updateWorkflow: issues.flatMap((i) => [
        `gh issue comment ${i.number} --repo boofpackdev/bunny -m "Starting..."`,
        `// work on #${i.number}`,
        `gh issue close ${i.number} --repo boofpackdev/bunny`,
      ]),
    },
  };
}

/**
 * Print a ready-to-use task prompt (for copying into Task calls)
 */
export function printTaskPrompt(ctx: IssueContext): void {
  const template = generateTaskPrompt(ctx);
  console.log("=".repeat(60));
  console.log(`ISSUE: #${template.meta.issue}`);
  console.log(`URL: ${template.meta.issueUrl}`);
  console.log("=".repeat(60));
  console.log("\n--- PROMPT FOR DROID ---\n");
  console.log(template.prompt);
  console.log("\n--- END PROMPT ---\n");
}

// CLI usage
if (import.meta.main) {
  const args = process.argv.slice(2);
  const issueNum = parseInt(args[0] ?? "0", 10);
  const issueTitle = args.slice(1).join(" ") || "Untitled Task";

  if (!issueNum) {
    console.log("Usage: bun task-template.ts <issue-number> [title]");
    console.log("Example: bun task-template.ts 7 Implement Hermes Provider");
    process.exit(1);
  }

  printTaskPrompt({ number: issueNum, title: issueTitle });
}
