# hermes-issues

Manage GitHub issues for the Hermes Frontend Integration project.

## Simple Workflow (Recommended)

Use the `bun run work` and `bun run complete` commands:

```bash
# Start working on issue #7
bun run work 7

# ... do the work ...

# Mark issue #7 as complete
bun run complete 7 "Implemented Hermes provider with streaming support"
```

## Manual Commands (if needed)

### Start Work on Issue

```bash
gh issue comment <NUMBER> --repo boofpackdev/bunny -b "Starting work on this issue..."
gh issue edit <NUMBER> --repo boofpackdev/bunny --add-label "in progress"
```

### Add Progress Update

```bash
gh issue comment <NUMBER> --repo boofpackdev/bunny -b "Progress: [what you did]"
```

### Mark as Blocked

```bash
gh issue comment <NUMBER> --repo boofpackdev/bunny -b "Blocked by: [reason]"
gh issue edit <NUMBER> --repo boofpackdev/bunny --add-label "blocked"
```

### Complete Issue

```bash
gh issue comment <NUMBER> --repo boofpackdev/bunny -b "Completed: [summary]"
gh issue close <NUMBER> --repo boofpackdev/bunny
```

## Labels

| Label | Description |
|-------|-------------|
| `in progress` | Issue is actively being worked on |
| `blocked` | Issue is blocked by another issue |
| `needs-changes` | Changes requested during review |
| `review requested` | Awaiting code review |

## Quick Reference

| Action | Command |
|--------|---------|
| Start working | `bun run work <N>` |
| Complete | `bun run complete <N>` |
| List mine | `gh issue list --assignee @me --state open` |
| List by milestone | `gh issue list --milestone "M1"` |

## Workflow Checklist

- [ ] Before starting: `bun run work <N>`
- [ ] During work: Post progress comments if needed
- [ ] If blocked: Add `blocked` label + comment
- [ ] After completing: `bun run complete <N>`
- [ ] If review needed: Add `review requested` label
