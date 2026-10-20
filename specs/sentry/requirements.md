# Sentry: Requirements

Status: Approved <!-- Draft → Approved -->
Design handoff: none

## Goal
Right now a crash on a tester's phone only reaches us if they tell us about it,
and even then we have no stack trace. This adds `@sentry/react-native` so JS
errors, React render errors and native iOS crashes are reported to the Sentry
project `readpanda-z9/readpanda-mobile`, with screen-level performance traces.
Each report is tagged with the release and build it came from, and Ad Hoc builds
upload source maps and dSYMs so production stack traces point at our source.

## Out of scope
- Session Replay, profiling, Sentry Logs and User Feedback (separate spec later)
- Android source map and ProGuard upload. The SDK reaches Android through
  autolinking, but there's no Android release lane yet.
- Sentry in the backend (`readpanda` repo)
- Alerts, dashboards and Slack routing
- Forwarding `src/utils/logger.js` output to Sentry

## Requirements

### R1. Error and crash capture
**User story:** As the developer, I want every crash and unhandled error from
testers' phones reported to Sentry, so I can fix bugs without needing a
reproduction from the tester.

**Acceptance criteria**
1. WHEN the app launches with a non-empty `SENTRY_DSN` THE app SHALL initialize
   Sentry before the root component renders.
2. WHEN an unhandled JS exception or unhandled promise rejection occurs THE app
   SHALL report it to Sentry.
3. WHEN a component throws during render THE root component SHALL report the
   error to Sentry through `Sentry.wrap`.
4. WHEN the iOS app crashes natively THE app SHALL report the crash to Sentry
   on its next launch.
5. IF `SENTRY_DSN` is empty or missing THEN THE app SHALL start normally, with
   Sentry turned off and no warnings shown in the app.
6. IF the device is offline when an error occurs THEN THE SDK SHALL keep the
   event and send it once the device is back online.
7. IF secure storage fails to open at launch THEN THE app SHALL report the
   error to Sentry and still show its retry screen.

### R2. Performance tracing
**User story:** As the developer, I want to see app start time, screen loads
and API latency, so I can find slow screens.

**Acceptance criteria**
1. WHEN the app cold-starts THE app SHALL record an app start transaction.
2. WHEN the reader moves to a different screen THE app SHALL record a
   navigation transaction named after the React Navigation route.
3. WHEN the app calls the ReadPanda backend THE app SHALL record an HTTP span
   and SHALL add trace headers only to requests for the backend's host.
4. THE app SHALL sample every transaction in development and 20% of
   transactions in production.

### R3. Release and environment tags
**User story:** As the developer, I want each event to show which build it came
from, so I can tell whether a bug is new and whether a fix shipped.

**Acceptance criteria**
1. THE app SHALL tag every event with `environment` set to `development` in
   Debug builds and `production` in Release builds.
2. THE app SHALL tag every event with `release` set to
   `<bundle id>@<marketing version>+<build number>` and `dist` set to the build
   number, the same values the uploaded source maps and dSYMs carry.

### R4. Reader identity without personal data
**User story:** As the developer, I want to know how many readers an error
affects, without sending their personal data to a third party.

**Acceptance criteria**
1. WHEN a reader is signed in (from storage at launch, or a new sign-in) THE app
   SHALL attach only their account's `uuid` to events.
2. WHEN the reader signs out THE app SHALL clear the user from Sentry.
3. THE app SHALL NOT send default PII (IP address, emails, usernames) to Sentry.

### R5. Readable iOS stack traces
**User story:** As the developer, I want stack traces from Ad Hoc builds to show
our file, line and function names, so a report from production is actionable.

**Acceptance criteria**
1. WHEN a Release build is archived with `SENTRY_AUTH_TOKEN` set THE build
   SHALL upload the JS bundle's source maps for that build's release and dist.
2. WHEN a Release build is archived with `SENTRY_AUTH_TOKEN` set THE build
   SHALL upload the dSYMs for the app and widget targets.
3. IF `SENTRY_AUTH_TOKEN` isn't set (Debug builds, or a contributor without the
   token) THEN THE build SHALL succeed and skip the upload.
4. WHEN `yarn release` runs locally or in the Firebase Release workflow THE
   pipeline SHALL provide `SENTRY_AUTH_TOKEN` to the archive step.

### R6. Setup verification
**User story:** As the developer, I want to see one real error arrive in
Sentry, so I know the setup works end to end and not only on paper.

**Acceptance criteria**
1. WHEN the developer triggers the temporary test error in a Debug build THE
   error SHALL appear in `readpanda-mobile` with `environment: development`.
2. THE test trigger SHALL exist only in `__DEV__` builds.
3. THE test trigger SHALL be removed before the branch merges.
4. WHEN an error comes from an Ad Hoc build THE issue in Sentry SHALL show
   source file, line and function names for our JS frames.

### R7. Docs and tooling
**User story:** As a contributor, I want the setup documented and the tests
unaffected, so I can build without the Sentry secrets.

**Acceptance criteria**
1. THE docs (`.env.example`, `fastlane/.env.example`, `docs/RUN.md`) SHALL
   explain `SENTRY_DSN` and `SENTRY_AUTH_TOKEN`, where to get them, and that the
   app runs without them.
2. WHEN `yarn test` runs THE Jest suite SHALL pass without a DSN or network
   access.

## Open questions
- [x] Which field is the stable account ID? `uuid` (the backend's
      `models.User.UUID`, already read by `commentsStore`).
- [x] Should the secure-storage failure be reported? Yes, as R1.7.
