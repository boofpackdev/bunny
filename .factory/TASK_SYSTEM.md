# Task System for Hermes Frontend Integration

This directory contains tools for generating standardized task prompts that ensure GitHub issues are updated consistently, regardless of which droid works on the task.

## Philosophy

**Droids are dumb. Prompts carry context.**

- Droids (workers, reviewers, etc.) should be reusable and project-agnostic
- Issue awareness lives in the **task prompt**, not in the droid
- Any droid can work on any issue by reading the update workflow from the prompt

## Quick Start

### Generate a Task Prompt

```bash
# From the bunny directory:
bun src/utils/task-template.ts 7 "Implement Hermes Provider"

# Or import in code:
import { generateTaskPrompt } from './src/utils/task-template';
const template = generateTaskPrompt({ number: 7, title: "Implement Hermes Provider" });
console.log(template.prompt);
```

### Spawn a Worker with the Prompt

```typescript
import { generateTaskPrompt } from './src/utils/task-template';

const template = generateTaskPrompt({
  number: 7,
  title: "Implement Hermes Provider",
  cwd: "openclaude/src/providers",
  extraInstructions: "Use OpenAI-compatible API pattern for Hermes backend."
});

// Pass template.prompt to a Task() call
Task(subagent_type="worker", prompt=template.prompt)
```

## File Structure

```
.factory/
├── droids/
│   ├── hermes-worker.toml     # Generic worker droid config
│   └── hermes-reviewer.toml  # Reviewer droid config
├── skills/
│   └── hermes-issues.md       # Issue management skill
└── TASK_SYSTEM.md            # This file
src/utils/
└── task-template.ts          # Task prompt generator
```

## Usage Examples

### 1. Simple Task (one issue)

```typescript
const template = generateTaskPrompt({
  number: 7,
  title: "Implement Hermes Provider"
});

Task(subagent_type="worker", prompt=template.prompt)
```

### 2. Review Task

```typescript
const template = generateReviewPrompt({
  number: 15,
  title: "Code review for Docker integration"
}, [
  "openclaude/src/docker/manager.ts",
  "openclaude/src/docker/compose.ts"
]);

Task(subagent_type="hermes-reviewer", prompt=template.prompt)
```

### 3. Batch Task (multiple issues)

```typescript
const template = generateBatchPrompt([
  { number: 13, title: "Port Docker manager" },
  { number: 14, title: "Create Docker compose" },
  { number: 15, title: "Create Docker self-hosted" }
]);

Task(subagent_type="worker", prompt=template.prompt)
```

## The Required Workflow

Every task prompt includes this workflow that the droid MUST follow:

### Before Starting
```bash
gh issue comment <NUMBER> --repo boofpackdev/bunny -m "Starting work..."
gh issue edit <NUMBER> --repo boofpackdev/bunny --add-label "in progress"
```

### During Work
Post progress comments when significant changes are made.

### After Completion
```bash
gh issue comment <NUMBER> --repo boofpackdev/bunny -m "Completed: [summary]"
gh issue close <NUMBER> --repo boofpackdev/bunny
```

### If Blocked
```bash
gh issue comment <NUMBER> --repo boofpackdev/bunny -m "Blocked by: [reason]"
gh issue edit <NUMBER> --repo boofpackdev/bunny --add-label "blocked"
```

## Droids

### hermes-worker
Generic worker droid for implementation tasks. Reads workflow from prompt.

### hermes-reviewer
Specialized droid for code reviews. Focuses on correctness, style, security.

## Skills

### hermes-issues
Quick reference for issue management commands. Use with any droid.

## No Custom Droid for Each Project

Notice: We do NOT create `hermes-worker`, `bunny-worker`, `openclaude-worker` etc.

Instead:
- One generic `worker` droid
- Issue context passed in the prompt
- Same pattern works for ANY project

This keeps droids reusable. A `worker` can work on hermes today and a different project tomorrow without modification.
