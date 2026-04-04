# Hermes Task System - Quick Reference

## Generate a Task Prompt

```bash
# Basic
bun src/utils/task-template.ts <issue-number> <title>

# Examples:
bun src/utils/task-template.ts 7 "Implement Hermes Provider"
bun src/utils/task-template.ts 13 "Port Docker manager"
bun src/utils/task-template.ts 24 "Merge session formats"
```

## Spawn a Task (in code)

```typescript
import { generateTaskPrompt } from './src/utils/task-template';

const template = generateTaskPrompt({
  number: 7,
  title: "Implement Hermes Provider",
  cwd: "openclaude/src/providers"
});

Task(subagent_type="worker", prompt=template.prompt)
```

## Issue Update Commands

| Action | Command |
|--------|---------|
| Start work | `gh issue comment <N> -m "Starting..."` + `--add-label "in progress"` |
| Progress | `gh issue comment <N> -m "Progress: ..."` |
| Blocked | `gh issue edit <N> --add-label "blocked"` |
| Complete | `gh issue close <N>` |
| List mine | `gh issue list --assignee @me --state open` |
| List by milestone | `gh issue list --milestone "M1"` |

## The Required Workflow

Every task prompt includes this. Droid MUST follow:

```
1. Before: gh issue comment <N> ... "Starting..."
2. During: Post progress comments
3. After:  gh issue comment <N> ... "Completed: ..."
           gh issue close <N>
4. Blocked: Add "blocked" label + comment
```

## Droids Available

| Droid | Use For |
|-------|---------|
| `worker` | Generic implementation tasks |
| `hermes-worker` | Worker with log saving |
| `hermes-reviewer` | Code review tasks |

## Skills

| Skill | Command | Use |
|-------|---------|-----|
| hermes-issues | `/skill hermes-issues` | Quick issue commands reference |

## File Locations

```
.factory/
├── droids/
│   ├── hermes-worker.toml    # Worker config
│   └── hermes-reviewer.toml  # Reviewer config
├── skills/
│   └── hermes-issues.md      # Issue commands
└── TASK_SYSTEM.md            # Full documentation

src/utils/
└── task-template.ts          # Prompt generator
```

## Typical Workflow

```bash
# 1. Generate prompt for issue #7
bun src/utils/task-template.ts 7 "Implement Hermes Provider"

# 2. Copy the prompt

# 3. Spawn a Task in your orchestrator:
Task(subagent_type="worker", prompt="<paste prompt>")

# 4. The droid follows the workflow:
#    - Comments "Starting..."
#    - Does the work
#    - Comments "Completed..."
#    - Closes the issue
```

## Batch Tasks

```typescript
import { generateBatchPrompt } from './src/utils/task-template';

const template = generateBatchPrompt([
  { number: 13, title: "Port Docker manager" },
  { number: 14, title: "Create compose" },
  { number: 15, title: "Create self-hosted" }
]);

Task(subagent_type="worker", prompt=template.prompt)
// Droid works through all 3, updating each
```

## Review Tasks

```typescript
import { generateReviewPrompt } from './src/utils/task-template';

const template = generateReviewPrompt({
  number: 15,
  title: "Review Docker integration"
}, [
  "openclaude/src/docker/manager.ts",
  "openclaude/src/docker/compose.ts"
]);

Task(subagent_type="hermes-reviewer", prompt=template.prompt)
```

## Key Principle

**Droids are dumb. Prompts carry context.**

- Any droid works with any issue
- Issue workflow lives in the prompt
- Droids stay reusable/generic
