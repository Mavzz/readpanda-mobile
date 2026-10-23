---
description: Interview me, then write requirements, design and tasks for a new feature spec
argument-hint: <feature-slug> [short description]
---

Create a spec for: $ARGUMENTS

1. Read `CLAUDE.md`, `docs/DESIGN.md` and the templates in `specs/_templates/`. If `docs/handoff/<feature-slug>/` exists, read it as the visual source of truth.
2. Explore the code this feature will touch so the spec names real files, stores and routes.
3. Before writing anything, ask me the questions you need answered: scope, edge cases, and anything the handoff leaves unclear. Batch them and keep them short.
4. Write `specs/<feature-slug>/requirements.md`, then `design.md`, then `tasks.md`, using the templates. Acceptance criteria use EARS (`WHEN … THE … SHALL …`). `requirements.md` also gets a `## Flows` section with a Mermaid sequence diagram for each main flow (happy path plus its important branches, messages labelled with requirement IDs), so someone new can follow the feature visually. Render the diagrams once to check they parse (`npx -y @mermaid-js/mermaid-cli -i requirements.md -o <scratch>/out.md`). Every task cites requirement IDs, and every criterion is covered by at least one task.
5. Leave the status as `Draft`. Don't write any feature code. Finish with a short summary and any questions still open.
