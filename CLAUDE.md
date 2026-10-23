# ReadPanda Mobile

React Native 0.84 app (React 19, React Navigation 7, zustand 5). Readers join
rooms around a book; comments unlock only once you've read that far. The
backend lives in the sibling `readpanda` repo.

## Commands
- `yarn install && yarn pods`: install everything
- `yarn start --reset-cache` then `yarn ios`: run the app (see docs/RUN.md)
- `yarn lint:check`: must pass with zero warnings before a task counts as done

## Layout
- `src/screens/`: one file per screen; bigger screens get a folder (`home/`, `profile/`, `roomLobby/`) with their own `*Styles.js` and `use*Data.js` hook
- `src/navigation/`: `AppNavigator` → `MainStackNavigator` → `TabNavigator` (Home · Discover · My Books · Rooms), one stack per tab
- `src/stores/`: zustand stores; `src/services/`: API calls
- `src/styles/global.js`: the `DS` token object; `src/styles/motion.js`: animation presets
- `ios/`: native reader (`ReaderChromeView.swift`, `RNPdfViewer`) and widget (`ReadPandaWidget/`)

## Design rules
- Before any UI work, read `docs/DESIGN.md`.
- Always use `DS` tokens (`DS.colors.*`, `DS.radius.*`, `DS.type.*`, `DS.space.*`) and never raw hex, sizes or font names. The hex → token map is in `docs/handoff/README.md`.
- The no-line rule: don't use 1px borders. Separate surfaces with a background shift instead.
- The font is Manrope, via `DS.font.*`.
- Design handoffs from Claude Design go in `docs/handoff/<feature>/`. The HTML in them is a reference to recreate with our components, not code to paste.

## Spec-driven workflow
Every non-trivial feature has a spec in `specs/<feature>/`:
- `requirements.md`: user stories and EARS-style acceptance criteria (`WHEN … THE <x> SHALL …`), plus a `## Flows` section with a Mermaid sequence diagram per main flow, labelled with the requirement IDs
- `design.md`: approach, files touched, data and navigation changes, edge cases
- `tasks.md`: a numbered checklist where each task cites the requirement IDs it covers

Rules:
- Don't write feature code until `tasks.md` exists and the status line at the top of `requirements.md` says `Approved`.
- Do one task at a time. When it's done, tick it in `tasks.md` and add a one-line note if the result differs from `design.md`.
- If the spec turns out to be wrong, update the spec first, then the code.
- When every task is done, check the acceptance criteria before committing. Go one requirement at a time, together: I check what the code, API and database can show; you check what needs a device. Tick each criterion in the `## Acceptance` list in `tasks.md`, or note why it's partial or waived. Fix what fails, then re-check it. Commit once every criterion is ticked or waived.
- Templates live in `specs/_templates/`. Commands: `/spec-new`, `/spec-task`, `/spec-verify`.

## Code style
- Match the surrounding code: functional components, hooks, `StyleSheet.create` at the bottom of the file.
- Write comments only to explain *why*, in the same plain voice as the existing ones.
- Read sizes with `useWindowDimensions()`, not `Dimensions.get` (it has to react to rotation and iPad multitasking).
