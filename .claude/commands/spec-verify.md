---
description: Check the code against a spec's acceptance criteria
argument-hint: <feature-slug>
---

Verify the spec `specs/$ARGUMENTS/` against the code.

1. Read all three spec files and the handoff if there is one.
2. For every acceptance criterion, find the code that satisfies it and mark it **Met** (cite file:line), **Partial** or **Missing**. Don't guess: if something can only be checked on a device, say so and give the manual steps.
3. Flag code changes on this branch that no requirement asks for (scope creep).
4. Flag UI that breaks `docs/DESIGN.md`: raw hex, 1px borders, non-Manrope fonts.
5. Reply with a table of criteria and then a short list of fixes. Don't edit code unless I ask.
