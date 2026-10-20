# ReadPanda+ off switch: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes.

- [x] 1. The switch (R1.1, R1.2, R1.3, R3.3)
  - `purchasesService.js`: `isPlusEnabled`; `configurePurchases` returns false while off
- [x] 2. `.env.example` (R1.4)
  - document `PLUS_ENABLED`; add it to your local `.env.dev` / `.env.prod`
- [x] 3. Gate (R2.1, R2.2, R2.3)
  - `usePlusGate`: run the action while off
- [x] 4. Settings (R2.2, R3.1, R3.2)
  - hide `plusGroup` and the Delete account note while off
- [x] 5. Tests (R2.1, R2.3)
  - `src/hooks/__tests__/usePlusGate.test.js`; `yarn test` passes
- [x] 6. Check a release build on the Simulator (R2.1, R2.2, R3.1, R3.3)
  - `yarn ios --mode Release` with the switch off: create a second room and a fourth bucket without a paywall; no ReadPanda+ row in Settings; no RevenueCat lines in the log

## Notes
<!-- One line per change from design.md: "Task 3: used X instead of Y because …" -->
Task 1: the old "key missing" branch folded into the switch check; it now warns only when `PLUS_ENABLED=true` has no key.
