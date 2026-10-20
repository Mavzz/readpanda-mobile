# Bug reporting: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes.

- [ ] 1. Sending in `sentry.js` (R4.1, R4.2, R4.3, R4.5, R6.3, R6.5)
  - export `isSentryEnabled`
  - `beforeSend` records the last error event's ID and time; `recentEventId()` (5 minutes)
  - `sendBugReport({ message, email, image })` → `Sentry.captureFeedback` with an optional email and attachment; empty email → `undefined`
  - add `captureFeedback` and `lastEventId` to the Jest mock in `jest.setup.js`
- [ ] 2. `BugReportSheet` UI (R2.1, R2.2, R2.3, R2.4, R2.5, R5.1, R5.2, R5.3, R6.1, R6.2, R6.4)
  - export `Sheet` from `SettingsSheets.js`; add `BugReportSheet` with the description field, Send and Cancel
  - optional email field: starts empty, never prefilled; invalid address disables Send and shows the hint in `DS.colors.error`
  - `KeyboardAvoidingView`; field max height; `DS` tokens only, no borders
  - accessibility labels; Send announces when it's disabled
- [ ] 3. Discard confirmation (R2.6)
  - closing with text in either field opens `ConfirmSheet` ("Discard this report?")
- [ ] 4. Screenshot (R3.1, R3.2, R3.3, R3.4)
  - `launchImageLibrary` with resize and base64; thumbnail with remove; keep the text on cancel or error
  - mock `react-native-image-picker` in `jest.setup.js`
  - update `NSPhotoLibraryUsageDescription` in `ios/ReadPanda/Info.plist` to mention bug-report screenshots
- [ ] 5. Wire it into Settings (R1.1, R1.2, R1.3, R4.4, R4.6)
  - "Report a bug" row after "Help & support", only when `isSentryEnabled`
  - on send: close and show the "Thanks — your report was sent" toast; on throw: stay open, error toast
- [ ] 6. Tests (R2.2, R2.3, R2.6, R3.2, R4.1, R4.6, R6.2, R6.3, R6.4)
  - `src/screens/profile/__tests__/BugReportSheet.test.js`; `yarn test` passes
- [ ] 7. Verify in Sentry (R4.1, R4.2, R4.3, R4.5, R6.3, R6.5)
  - Debug build: send a report with and without a screenshot and confirm both
    in User Feedback, with the `uuid`, build and no name or email
  - send one with an email: it shows as the report's contact email, and the
    next error event's user still has only the `id`
  - send one right after a test error and confirm it's linked to that issue
  - turn on Airplane mode, send, turn it off, relaunch; confirm it arrives

## Notes
<!-- One line per change from design.md: "Task 3: used X instead of Y because …" -->
