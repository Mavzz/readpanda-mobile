# Help & support: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes.

- [x] 1. Questions and answers (R2.4, R2.5, R2.6, R2.7)
  - `src/screens/profile/helpTopics.js`: `helpTopics(plusEnabled)` with the approved list; ReadPanda+ questions and limits only while on
- [x] 2. Email support (R3.2, R3.3, R3.4)
  - `src/utils/support.js`: `SUPPORT_EMAIL`, `emailSupport()` with the mailto URL, version-only body, clipboard + toast fallback
- [x] 3. `HelpScreen` and route (R1.2, R2.1, R2.2, R2.3, R3.1, R5.1, R5.2, R5.3, R5.4, R5.5)
  - `HelpQuestion` rows (expand/collapse, `expanded` state); "Common questions" and "Get in touch" groups; footer
  - `Help` route in `MainStackNavigator`
- [x] 4. Report a bug on the help screen (R4.1, R4.2, R4.3, R4.4)
  - row only when `isSentryEnabled`; own `BugReportSheet` with the sent toast; Settings' row unchanged
- [x] 5. Wire Settings (R1.1)
  - "Help & support" navigates to `Help` instead of the "coming soon" toast
- [x] 6. Tests (R2.2, R2.3, R2.5, R2.7, R3.2, R3.3, R3.4, R4.2)
  - `src/screens/profile/__tests__/HelpScreen.test.js`; `yarn test` passes
- [x] 7. Check on the Simulator (R1.1, R1.2, R3.2, R3.4, R4.3, R5.2, R5.3, R5.4)
  - open from Settings and back; expand several answers
  - "Email us" opens Mail with the subject and version lines (the Simulator has no Mail account, so this also shows the copy fallback; a device with Mail shows the compose screen)
  - send a bug report from the help screen
  - VoiceOver announces expanded/collapsed; largest text size wraps; iPad simulator width is capped

## Notes
<!-- One line per change from design.md: "Task 3: used X instead of Y because …" -->
Task 2: `support.js` also exports `supportEmailBody()` and `supportEmailUrl()`, so the tests can check the email without opening Mail.
Task 5: removed Settings' `comingSoon` helper; Help & support was its last user.
Task 6: the tests stub `BugReportSheet` (it has its own tests) and cover `helpTopics` both with ReadPanda+ on and off.
Task 7: checked on the iPhone and iPad Simulators; Mail opening a new email still to check on a device with a mail account.
