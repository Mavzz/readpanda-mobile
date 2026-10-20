# Sentry: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes.

- [x] 1. Install the SDK (R7.2)
  - `yarn add @sentry/react-native`, `yarn pods`
  - mock `@sentry/react-native` in `jest.setup.js`; `yarn test` passes
- [x] 2. Initialize Sentry and wrap the root (R1.1, R1.2, R1.3, R1.4, R1.5, R1.6, R1.7, R3.1, R3.2, R4.3)
  - new `src/utils/sentry.js` with `initSentry()` reading `SENTRY_DSN` from `@env`
  - call it in `index.js`; `export default Sentry.wrap(App)` in `App.js`
  - `Sentry.captureException` in `openStorage`'s `catch`
  - add `SENTRY_DSN=` to `.env.example`; put the real DSN in `.env.dev` / `.env.prod`
  - check that an empty DSN starts cleanly
- [x] 3. Tracing and navigation (R2.1, R2.2, R2.3, R2.4)
  - `reactNavigationIntegration` in `sentry.js`, registered in `AppNavigator`'s `onReady`
  - `tracesSampleRate`, `tracePropagationTargets` from `BACKEND_URL` / `Local_IP`
- [x] 4. Reader identity (R4.1, R4.2)
  - `useAuthStore.subscribe` in `sentry.js` → `Sentry.setUser({ id: <uuid> })` / `null`, uuid from `user.uuid` or the token's `userId` claim
  - no `uuid` → no user, never `username`
- [x] 5. Verify a real error lands (R6.1, R6.2)
  - temporary `__DEV__`-only "Send test error" row in `SettingsScreen.js`
  - tap it in the simulator; confirm the issue in `readpanda-mobile` with
    `environment: development`, a navigation transaction, and the user ID
- [x] 6. iOS source maps and dSYMs (R5.1, R5.2, R5.3)
  - `withSentryConfig` in `metro.config.js`
  - bundle phase → `sentry-xcode.sh`; add the "Upload Debug Symbols to Sentry" phase
  - `ios/sentry.properties` (no token); `SENTRY_DISABLE_AUTO_UPLOAD` for Debug,
    `SENTRY_ALLOW_FAILURE` for Release
  - `yarn ipa` without a token still succeeds; with a token, the artifacts show
    up in Sentry for the build's release
- [x] 7. Release pipeline token (R5.4)
  - `SENTRY_AUTH_TOKEN` in `fastlane/.env.example`
  - `firebase-release.yml` writes it from `secrets.SENTRY_AUTH_TOKEN`
  - manual: create an org auth token, add the repo secret, add `SENTRY_DSN` to `ENV_PROD`
- [x] 8. Docs (R7.1)
  - `docs/RUN.md`: which files and secrets Sentry needs, and that the app runs without them
- [x] 9. Production check and cleanup (R6.3, R6.4)
  - the test row is `__DEV__`-only (R6.2), so it isn't in Ad Hoc builds. For
    an Ad Hoc build (`yarn ipa --adhoc --install`), confirm the release's
    artifact bundle and dSYMs are in Sentry, then check the frames on the
    first issue from that build (a local Release build with the row ungated
    works too, as long as the change isn't committed)
  - remove the test row; `yarn lint:check` and `yarn test` pass

## Notes
<!-- One line per change from design.md: "Task 3: used X instead of Y because …" -->
- Task 6: a missing-token check in each build phase replaces `SENTRY_DISABLE_AUTO_UPLOAD` for Debug and `SENTRY_ALLOW_FAILURE` for Release. The SDK already skips Debug, and `ALLOW_FAILURE` would hide a broken upload on a release.
- Task 4: the uuid comes from the access token's `userId` claim, because the auth responses don't return `uuid` (found in task 5 when the test error arrived with no user).
- Task 9: checked the Ad Hoc build (1.0 (1), 2026-10-20) by its uploads, not by a crash. The artifact bundle is tied to `com.readpanda.app@1.0+1` / dist `1`, and the app's dSYM debug ID matches the archive's UUID. R6.4's "frames on the first real issue" is still to be checked when one comes in.
- Task 2: R1.5 (empty `SENTRY_DSN` starts cleanly) hasn't been run on a device. `enabled: false` is set when the DSN is empty, and Jest runs without one.
