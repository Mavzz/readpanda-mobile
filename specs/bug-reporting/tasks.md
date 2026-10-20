# Bug reporting: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes.

- [x] 1. Sending in `sentry.js` (R4.1, R4.2, R4.3, R4.5, R6.3, R6.5)
  - export `isSentryEnabled`
  - `beforeSend` records the last error event's ID and time; `recentEventId()` (5 minutes)
  - `sendBugReport({ message, email, image })` → `Sentry.captureFeedback` with an optional email and attachment; empty email → `undefined`
  - add `captureFeedback` to the Jest mock in `jest.setup.js`
- [x] 2. `BugReportSheet` UI (R2.1, R2.2, R2.3, R2.4, R2.5, R4.6, R5.1, R5.2, R5.3, R6.1, R6.2, R6.4)
  - `Sheet` gains `avoidKeyboard`; add `BugReportSheet` to `SettingsSheets.js` with the description field, Send and Cancel
  - optional email field: starts empty, never prefilled; invalid address disables Send and shows the hint in `DS.colors.error`
  - field max height; content capped at `DS.layout.sheetMax`; `DS` tokens only, no borders
  - calls `sendBugReport`; on throw, stays open with an error message in the sheet (R4.6)
  - accessibility labels; Send announces when it's disabled
- [x] 3. Discard confirmation (R2.6)
  - split `ConfirmBody` out of `ConfirmSheet`; closing with text in either field swaps the form for it ("Discard this report?")
- [x] 4. Screenshot (R3.1, R3.2, R3.3, R3.4)
  - `launchImageLibrary` with resize and base64; thumbnail with remove; keep the text on cancel or error
  - mock `react-native-image-picker` in `jest.setup.js`
  - update `NSPhotoLibraryUsageDescription` in `ios/ReadPanda/Info.plist` to mention bug-report screenshots
- [x] 5. Wire it into Settings (R1.1, R1.2, R1.3, R4.4)
  - "Report a bug" row after "Help & support", only when `isSentryEnabled`
  - on send: close and show the "Thanks — your report was sent" toast
- [x] 6. Tests (R2.2, R2.3, R2.6, R3.2, R4.1, R4.6, R6.2, R6.3, R6.4)
  - `src/screens/profile/__tests__/BugReportSheet.test.js`; `yarn test` passes
- [x] 7. Verify in Sentry (R4.1, R4.2, R4.3, R4.5, R6.3, R6.5)
  - Debug build: send a report with and without a screenshot and confirm both
    in User Feedback, with the `uuid`, build and no name or email
  - send one with an email: it shows as the report's contact email, and the
    next error event's user still has only the `id`
  - send one right after a test error and confirm it's linked to that issue
  - turn on Airplane mode, send, turn it off, relaunch; confirm it arrives

## Notes
<!-- One line per change from design.md: "Task 3: used X instead of Y because …" -->
Task 1: the Jest mock only gained `captureFeedback`; `lastEventId` isn't used, since `beforeSend` tracks the event. A screenshot picked as PNG is sent as `screenshot.png` with its own content type, not forced to JPEG.
Task 2: the form's text uses `DS.type`/`DS.spacing`; the field heights (120–200) and the thumbnail (40) have no token, so they're plain numbers like the other sheets' sizes.
Task 3: a picked screenshot also counts as "something to lose", so a report with only a screenshot asks before closing too.
Task 6: the tests run against the real `sentry.js` (with `@env` and `authStore` mocked), so they check what reaches `captureFeedback`, not just that the sheet called something.
Task 7: verified on the iOS Simulator (READPANDA-MOBILE-2, -3, -4, -6). An offline report is kept on disk and sent when the app next starts or sends something, not as soon as the network returns, and Sentry files it under the time it was written. Sentry's server copies a contact email onto the report's own user (R6.5 reworded); the reader's other events still carry only the `id` (READPANDA-MOBILE-5).
