---
description: Implement one task from an approved spec and tick it off
argument-hint: <feature-slug> <task-number>
---

Implement a task from a spec. Arguments: $ARGUMENTS (feature slug, then task number).

1. Read `specs/<feature-slug>/requirements.md`, `design.md` and `tasks.md`. If `requirements.md` isn't marked `Approved`, stop and tell me.
2. Implement only the task with that number, following `design.md` and the rules in `CLAUDE.md`. If a handoff exists, match it using `DS` tokens.
3. If the design doesn't work as written, stop and propose a spec change before you write code that drifts from it.
4. Run `yarn lint:check` and fix what it finds.
5. Tick the task in `tasks.md`. If anything differs from `design.md`, add a one-line note under `## Notes`. If the change alters a flow, update its diagram in `requirements.md` too.
6. Report what changed and which acceptance criteria this task should now satisfy, and how to check them by hand on a device.
