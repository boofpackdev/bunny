# hermes-issues

Manage GitHub issues for the Hermes Frontend Integration project.

## Prerequisites

- Authenticated with `gh` CLI: `gh auth status`
- Target repo: `boofpackdev/bunny`

## Commands

### Start Work on Issue

```bash
gh issue comment <NUMBER> --repo boofpackdev/bunny -m "Starting work on this issue..."
gh issue edit <NUMBER> --repo boofpackdev/bunny --add-label "in progress"
```

### Add Progress Update

```bash
gh issue comment <NUMBER> --repo boofpackdev/bunny -m "Progress: [what you did]"
```

### Mark as Blocked

```bash
gh issue comment <NUMBER> --repo boofpackdev/bunny -m "Blocked by: [reason or #blocked-issue]"
gh issue edit <NUMBER> --repo boofpackdev/bunny --add-label "blocked"
```

### Complete Issue

```bash
gh issue comment <NUMBER> --repo boofpackdev/bunny -m "Completed: [summary of changes]"
gh issue close <NUMBER> --repo boofpackdev/bunny
```

### Request Review

```bash
gh issue comment <NUMBER> --repo boofpackdev/bunny -m "Ready for review. Changes made: [summary]"
gh issue edit <NUMBER> --repo boofpackdev/bunny --add-label "review requested"
```

### Sync Blocking Issues

```bash
# Check if any blocking issues are resolved
gh issue view <BLOCKING_NUMBER> --repo boofpackdev/bunny --json state,title

# If unblocked, remove blocked label
gh issue edit <NUMBER> --repo boofpackdev/bunny --remove-label "blocked"
gh issue comment <NUMBER> --repo boofpackdev/bunny -m "Blocking issue #<BLOCKING_NUMBER> resolved. Unblocked."
```

## Quick Reference

| Action | Command |
|--------|---------|
| Start | `gh issue comment <N> -m "Starting..."` |
| Progress | `gh issue comment <N> -m "Progress: ..."` |
| Blocked | `gh issue edit <N> --add-label "blocked"` |
| Done | `gh issue close <N>` |
| List mine | `gh issue list --repo boofpackdev/bunny --assignee @me --state open` |
| List by milestone | `gh issue list --repo boofpackdev/bunny --milestone "M1"` |

## Workflow Checklist

- [ ] Before starting: Comment "Starting..." + add `in progress` label
- [ ] During work: Comment at least once with progress
- [ ] If blocked: Comment with reason + add `blocked` label
- [ ] After completing: Comment "Completed: ..." + close issue
- [ ] If review needed: Add `review requested` label

## Examples

### Starting Issue #7
```bash
gh issue comment 7 --repo boofpackdev/bunny -m "Starting work: Implementing Hermes provider..."
gh issue edit 7 --repo boofpackdev/bunny --add-label "in progress"
```

### Completing Issue #13
```bash
gh issue comment 13 --repo boofpackdev/bunny -m "Completed: Ported Docker manager.ts with container lifecycle management. All functions implemented: createHermesContainer, startContainer, stopContainer, etc."
gh issue close 13 --repo boofpackdev/bunny
```
