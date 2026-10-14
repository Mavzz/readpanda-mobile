# Sign Up Redesign: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes (and `go build ./... && go vet ./...` for
backend tasks). Backend tasks are in `readpanda/packages/api-go`.

### Backend
- [x] 1. `/signup` validation and errors: username rules and password ≥ 8 → 400 with `field`; 409 with `field` (username vs email) (R3.1, R8.3, R8.4)
- [x] 2. `GET /signup/available` with suggestion and rate limiting (R8.2, R3.2)
- [x] 3. `POST /auth/apple`: JWKS verify, sign in, link or create, private relay (R8.1)
- [x] 4. Apple token revocation on account delete, from the Sign in with Apple key in env; store Apple's refresh token at sign-in so it can be revoked (R8.5)
- [x] 4b. `ROUTES.md` for the above (R8.1–R8.5)

### App
- [x] 5. Apple sign-in plumbing: approve and add the library, entitlement, `appleSignUpLogin()`, `SignUpType.Apple` (R1.2)
- [x] 6. `useSignUpForm`: fields, validation, availability on blur, server-error mapping, no Alerts (R3.1–R3.5, R4.1, R4.2)
- [x] 7. `SignUpForm` and `OneTapButtons`: labels, eye, content types, Return chain, hints and check marks, inactive Create account (R1.1, R2.1–R2.4, R3.4, R3.5)
- [x] 8. Phone layout (17a/17b), with keyboard behaviour (R6.1, R5.1, R7.1)
- [x] 9. iPad layouts: centred card (17d) and split (17c, rewritten panel line), with keyboard behaviour (R6.2–R6.4, R5.2, R7.1)
- [x] 10. Terms line with toast links (R7.1, R7.2)
- [ ] 11. QA: Apple (new, returning, hidden email, cancelled), Google, email (taken name, taken email, short password, offline), every layout, rotation mid-typing; confirm the new screen doesn't ship before Apple works (R1.3, all)

## Notes
- Setup (2026-10-14): Apple Developer team `6F6H5A6JCC` is set on both targets (Debug and Release). The Sign in with Apple capability is added (`com.apple.developer.applesignin` in `ReadPanda.entitlements`). No device is registered yet, so device builds wait on that; simulator builds don't need a profile. The Sign in with Apple key (.p8) for R8.5 hasn't been created yet.
- Task 1: `validateSignup` normalises (trim, lowercase) and checks the username, email and password, answering 400 with `field`. The 409 is split into username or email, matched case-insensitively. Login now matches the username case-insensitively, preferring an exact match, because new names are stored lowercase. Tests: `internal/handlers/signup_test.go`.
- Task 2: `GET /signup/available` with suggestions (`.reads`, `_reads`, then two digits), behind a new `middleware.RateLimit(30/min per IP)`. The limiter keys on the *last* `X-Forwarded-For` hop, which Cloud Run's front end appends; earlier hops can be spoofed. Counts are per instance. Tests: `internal/middleware/ratelimit_test.go`.
- Task 3: `POST /auth/apple` (`AppleAuth`): the token is verified against Apple's cached JWKS (`utils.VerifyAppleIdentityToken`, RS256, iss/aud/exp). The account is found by `apple_sub`, else the verified email is linked, else a new account is created. Usernames come from `usernameFrom` (name or email local part, accents kept as plain letters, "reader" for private-relay addresses), then a suggestion if taken. Schema: `scripts/migrate_apple_signin.sql` adds the `social_apple` login type, `apple_sub` (unique) and `apple_refresh_token`. Run on local; also added by hand to `readpanda_schema.sql` (not a pg_dump, to avoid unrelated drift). **Run the migration on Supabase before deploying.** Config: `APPLE_BUNDLE_ID` (default com.readpanda.app) and `APPLE_TEAM_ID` are in `env.yaml`; key id and key go in the environment only.
- Task 4: the sign-in exchanges `authorization_code` for Apple's refresh token and stores it (best effort; skipped and logged until the key is configured). `utils.RevokeAppleToken` is ready. **But no account-deletion endpoint exists yet** (the app's Delete account only shows a toast), so nothing calls it. In-app deletion is also an App Store requirement (5.1.1(v)) on its own and needs a separate spec; revocation hooks into it.
- Backend checks: `go build`, `go vet` and `go test ./internal/...` pass, with tests for sign-up rules, `usernameFrom`, the rate limiter, Apple token verification and the client secret. A smoke run on port 8099 against the local DB returned free → available, "aditya" → taken with "aditya.reads", an invalid name and a short password → 400 with field, a taken name → 409 with field, and a bad Apple token → 401.
- Task 5: `@invertase/react-native-apple-authentication` 2.5.1 added (`pod install` needs `LANG=en_US.UTF-8` in a non-UTF-8 shell). `appleSignUpLogin()` returns `{ cancelled: true }` when the sheet is closed, and sends the identity token, the authorization code and the name to `/auth/apple`. `checkUsername()` calls `/signup/available`. `emailSignUp()` now returns the server's `{ error, field }`, parsed from apiService's "Client error N: body" throw. The Google service's own "Login failed" Alerts were removed: Login already alerts on a failed result, and Sign up shows a toast, so they were doubling up. `SignUpType.Apple` added. The iOS simulator build succeeds with the pod, team `6F6H5A6JCC` and the entitlement.
- Tasks 6–10: `src/screens/signUp/` holds `useSignUpForm`, `SignUpForm`, `OneTapButtons`, `SignUpLayouts` (phone / card / split) and `TermsLine`. `SignUpScreen` picks the layout by `sizeClass`. The keyboard uses ScrollView's `automaticallyAdjustKeyboardInsets`. The Apple button is drawn to Apple's own style (white with the black logo; new tokens `appleButton` / `appleButtonText`) rather than the library's native `AppleButton`, so it can sit side by side with Google. A returning Apple or Google user (200) no longer goes to onboarding; only a new account (201) does. A failed one-tap shows a toast. The "Try @suggestion" link fills in the suggested name.
- Not seen running: Sign up is behind Login on a signed-in simulator. Apple sign-in itself needs a device or an Apple ID on the simulator, plus a backend deploy with the migration.
