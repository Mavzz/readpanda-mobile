# Legal links: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes.

- [x] 1. `legalLinks.js` (R1.1, R1.2, R1.3, R1.4)
  - `SITE_URL`, `openLegalPage(page)` with the fallback toast
- [x] 2. Agreement line (R2.1, R2.2, R2.4, R5.1, R5.2)
  - `TermsLine`: 18+ text; links call `openLegalPage`
- [x] 3. Line on Login (R2.3)
  - `<TermsLine />` under the Create an account footer
- [x] 4. Settings rows (R3.1, R3.2)
  - "Terms of use" and "Privacy policy" replace "Terms & privacy policy"
- [x] 5. Paywall links (R4.1, R5.1)
  - both links call `openLegalPage`; `accessibilityRole="link"` and labels
- [x] 6. Tests (R1.1, R1.2, R1.4)
  - `src/utils/__tests__/legalLinks.test.js`; `yarn test` passes
- [x] 7. In-app Safari view (R1.1, R1.2, R1.5, R1.6)
  - `ios/SafariView.swift` + `.m`, added to the app target; `openLegalPage` uses it on iOS
- [x] 8. Tests for the in-app view (R1.1, R1.2, R1.4)
  - native view on iOS, browser fallback without it, toast when it rejects
- [x] 9. Check on the Simulator (R1.1, R1.2, R1.5, R1.6, R2.1, R2.3, R3.2, R4.1, R5.2)
  - every link opens the right page in the in-app view (once the site is live at `SITE_URL`); Done returns to the same screen, including over the paywall
  - Sign up and Login show the line on phone and iPad; it wraps at the largest text size

## Notes
<!-- One line per change from design.md: "Task 3: used X instead of Y because …" -->
Task 3: added `styles.terms` (16pt top margin) so the line doesn't sit tight against the footer.
Task 7: added via the xcodeproj gem, next to WidgetBridge; Simulator build succeeds.
Task 8: the tests set `NativeModules.SafariView` themselves, so `jest.setup.js` is unchanged.
