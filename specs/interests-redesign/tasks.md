# Interests Redesign: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes.

- [x] 1. New copy and flat chips; no step counter; header hidden in onboarding (R1.1–R1.3)
- [x] 2. `usePickCovers` + `FromYourPicks` row (R2.1–R2.3)
- [x] 3. Footer: Continue / Skip for now in onboarding, Save from Settings; Continue with nothing picked acts as Skip (R3.1–R3.3)
- [ ] 4. QA: phone and iPad (520pt column), first-run sign-up path, Settings path, offline (all)

## Notes
- Tasks 1–3 (built together, as one rewrite of `InterestScreen`): the header is switched per entry point with `navigation.setOptions` in the screen (hidden in onboarding, "Genres I like" with Back from Settings) instead of in `MainStackNavigator`. Selected chips are solid `primaryContainer` amber with a check, not 14a's gradient, since a gradient fill needs a layered view per chip; it's an easy follow-up if the difference shows. The column centres vertically on iPad only. A Save that fails stays on the screen (logged, as today); there's no error toast yet.
- Device review (2026-10-14): the covers lagged about 1s. Causes: a 300ms debounce, plus a fetch per genre only after it was picked, plus images downloading only when rendered. Now the cache is module-level (lasts the app session), the current picks are fetched on open and every other chip's genre in the background, each fetched genre's first 5 cover images are prefetched (`Image.prefetch`), and when every pick is cached the row updates in the same render.
