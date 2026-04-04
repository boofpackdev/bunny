# Hermes Task System - Quick Reference

## Simple Workflow

```bash
# Start working on an issue
bun run work 7

# ... do the work ...

# Mark as complete
bun run complete 7 "Added Hermes provider implementation"
```

## Commands

| Action | Command |
|--------|---------|
| Start working | `bun run work <N>` |
| Mark complete | `bun run complete <N> [notes]` |
| List my issues | `gh issue list --assignee @me --state open` |
| List by milestone | `gh issue list --milestone "M1"` |

## Manual GitHub Commands

| Action | Command |
|--------|---------|
| Start work | `gh issue comment <N> -b "Starting..."` + `--add-label "in progress"` |
| Progress | `gh issue comment <N> -b "Progress: ..."` |
| Blocked | `gh issue edit <N> --add-label "blocked"` |
| Complete | `gh issue close <N>` |

## Labels

| Label | When to use |
|-------|-------------|
| `in progress` | Issue is being worked on |
| `blocked` | Waiting on something |
| `needs-changes` | Review requested changes |
| `review requested` | Ready for review |

## For Droids

When spawning a Task for a droid, include issue context:

```typescript
const template = generateTaskPrompt({
  number: 7,
  title: "Implement Hermes Provider"
});

Task(subagent_type="worker", prompt=template.prompt)
```

## File Locations

```
src/commands/
├── work.ts      # bun run work <N>
└── complete.ts  # bun run complete <N> [notes]

src/utils/
└── task-template.ts  # Programmatic prompt generation

.factory/
├── skills/hermes-issues.md  # Issue commands reference
└── droids/                   # Droid configurations
```
