# Sentry: Design

## Approach
We set up bare React Native by hand (Path C in Sentry's docs), not with
`npx @sentry/wizard`. The wizard rewrites the Xcode project and Metro config in
ways we'd have to undo, and it writes the auth token into a properties file.

**Init.** A new `src/utils/sentry.js` owns the SDK. It reads `SENTRY_DSN` and
`BACKEND_URL` from `@env`, the same way `src/utils/Helper.js` reads the backend
values, and calls `Sentry.init` with:

- `dsn`. An empty value turns the SDK off (R1.5).
- `environment: __DEV__ ? 'development' : 'production'` (R3.1).
- `release` and `dist` are not set. The SDK defaults them to
  `<bundle id>@<version>+<build>` and `<build>`, the values `sentry-xcode.sh`
  uploads source maps under. `yarn release` sets the build number through
  `CURRENT_PROJECT_VERSION` (commit 021ce01), so the two always match (R3.2).
- `sendDefaultPii: false` (R4.3).
- `tracesSampleRate: __DEV__ ? 1.0 : 0.2` (R2.4).
- `tracePropagationTargets: [<backend host>]`, so trace headers don't go to
  RevenueCat, Google or Firebase (R2.3).
- `integrations: [navigationIntegration]`, a `reactNavigationIntegration`
  created and exported by this module (R2.2).
- `enableNativeFramesTracking: true`.

`index.js` calls `initSentry()` right after the `react-native-get-random-values`
import, before `AppRegistry.registerComponent`. `App.js` exports
`Sentry.wrap(App)` (R1.3). Unhandled JS errors, promise rejections, native
crashes, offline caching and app-start tracking are SDK defaults (R1.2, R1.4,
R1.6, R2.1).

**Navigation.** We keep `NavigationContainer` and `navigationRef`, because the
invite, push and widget hooks need the ref. We don't switch to
`Sentry.NavigationContainer`. `onReady` calls
`navigationIntegration.registerNavigationContainer(navigationRef)`.

**User.** `sentry.js` subscribes to `useAuthStore`. Whenever `user` or `token`
changes, it calls `Sentry.setUser({ id: <uuid> })`, or `Sentry.setUser(null)`
when the reader is signed out. The auth responses (`models.TokenResponse` and
the `/signup` map in `api-go`) don't include `uuid`, so the profile never has
one. The access token's `userId` claim is the UUID, though
(`utils.GenerateTokens(user.UUID, …)`), so we decode the JWT payload. We only
read it and never verify it, because it's only a label. `user.uuid` is still
preferred if the API ever adds it. One subscription covers `loadUser`, `signIn`, `updateUser` and
`signOut`, so a future code path that sets `user` can't skip it, and
`authStore.js` doesn't import Sentry (R4.1, R4.2).

**iOS uploads.** `withSentryConfig` in `metro.config.js` adds Debug IDs to the
bundle. The "Bundle React Native code and images" phase runs `sentry-xcode.sh`,
which wraps `react-native-xcode.sh` and uploads the source maps. A new "Upload
Debug Symbols to Sentry" phase after it runs `sentry-xcode-debug-files.sh`.
`ios/sentry.properties` holds the org, project and URL and is committed. The
token comes only from the `SENTRY_AUTH_TOKEN` environment variable, never a
file in the repo. For R5.3, both phases start with the same check. With no
`SENTRY_AUTH_TOKEN`, they set `SENTRY_DISABLE_AUTO_UPLOAD=true` and, outside
Debug, print an Xcode warning. With a token, the upload has to succeed. The
SDK's scripts already skip uploads in Debug. `SENTRY_ALLOW_FAILURE` isn't used,
because it would let a release with a broken upload go out silently.

**Release pipeline.** fastlane loads `fastlane/.env` into `ENV`.
`sh("yarn ipa --adhoc")` and `xcodebuild` pass it on to the build phases. So
`SENTRY_AUTH_TOKEN` only needs to be in `fastlane/.env` locally, and the
workflow writes it there from a new `SENTRY_AUTH_TOKEN` secret (R5.4). The
Fastfile doesn't need to change.

## Files
| File | Change |
|------|--------|
| `package.json`, `yarn.lock` | modified: add `@sentry/react-native` |
| `ios/Podfile.lock` | modified: `RNSentry` and `Sentry` pods via `yarn pods` |
| `src/utils/sentry.js` | new: `initSentry()`, `navigationIntegration`, auth store subscription |
| `index.js` | modified: call `initSentry()` before registering the app |
| `App.js` | modified: `export default Sentry.wrap(App)`; capture the storage failure |
| `src/navigation/AppNavigator.js` | modified: register `navigationRef` in `onReady` |
| `metro.config.js` | modified: wrap the config in `withSentryConfig` |
| `ios/ReadPanda.xcodeproj/project.pbxproj` | modified: bundle phase → `sentry-xcode.sh`; new debug-symbols phase; both skip the upload when there's no token |
| `ios/sentry.properties` | new: org `readpanda-z9`, project `readpanda-mobile`, no token |
| `.env.example` | modified: `SENTRY_DSN` |
| `fastlane/.env.example` | modified: `SENTRY_AUTH_TOKEN` |
| `.github/workflows/firebase-release.yml` | modified: write `SENTRY_AUTH_TOKEN` into `fastlane/.env` |
| `jest.setup.js` | modified: mock `@sentry/react-native` |
| `docs/RUN.md` | modified: Sentry section under "Files you get from a maintainer" and "Firebase App Distribution" |
| `src/screens/profile/SettingsScreen.js` | temporary: `__DEV__`-only "Send test error" row, removed in task 9 |

**Server-side privacy.** Even with `sendDefaultPii: false`, Sentry works out
the reader's city from their IP when an event arrives. Two settings live in
Sentry, not in this repo (readpanda-mobile → Security & Privacy):
"Prevent Storing of IP Addresses" is on, and two advanced scrubbing rules
remove `$user.ip_address` (IP addresses) and `$user.geo.**` (Anything).
Checked on 2026-10-20: new events carry only `user.id`.

## Data and state
- No new stores, API endpoints or persisted keys.
- `useAuthStore` gets one read-only subscriber.
- New env values: `SENTRY_DSN` in `.env.dev`, `.env.prod` and the `ENV_PROD`
  secret. `SENTRY_AUTH_TOKEN` in `fastlane/.env` and a new repo secret. The DSN
  is safe to ship in the bundle. The auth token must never reach it.

## Navigation
No route changes. `AppNavigator` adds an `onReady` handler.

## Edge cases
- **No DSN** (fresh clone, CI Jest run): the SDK is off, and nothing is sent or
  logged.
- **Offline**: the SDK caches up to 30 envelopes and sends them on the next
  launch with a connection.
- **Secure storage fails to open**: `openStorage`'s `catch` in `App.js` calls
  `Sentry.captureException` next to `log.error`, and the retry screen stays
  (R1.7).
- **Signed-in user without a `uuid`** (an old stored profile): set no user
  rather than falling back to `username`.
- **Errors before init**: anything thrown while `react-native-get-random-values`
  loads isn't captured. Native crashes there are, because the native SDK
  starts first.
- **Debug builds hitting Sentry**: they're tagged `development`, so they can be
  filtered out. Errors that only exist in Metro, like red boxes, still report.
  That's acceptable.
- **Widget extension**: the widget doesn't run the SDK, but its dSYM is
  uploaded with the app's, so a crash inside a shared framework still
  symbolicates.
- **Expected API failures** (401, 404, offline): `apiService` handles them
  without throwing, so they don't become issues.

## Alternatives considered
- **`npx @sentry/wizard`**: it rewrites the project files and stores the token
  in `sentry.properties`. We'd rather make the same changes by hand and review
  them.
- **`Sentry.NavigationContainer`**: it would replace the container that owns
  `navigationRef`, which three hooks depend on.
- **Hardcoding the DSN**: simpler, but dev and prod couldn't be turned off
  separately, and the `@env` pattern already exists.
- **Calling `Sentry.setUser` inside `authStore` actions**: that's four call
  sites to keep in sync, versus one subscription.
