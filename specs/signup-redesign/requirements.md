# Sign Up Redesign (turn 17): Requirements

Status: Approved (2026-10-14)
Design handoff: `docs/handoff/ReadPanda Design Review.dc.html` § 17 (intro and rules), § 17a (iPhone default), § 17b (iPhone typing, with an error), § 17c (iPad ≥ 1000pt split), § 17d (iPad 700–999pt centred card). Replaces the Sign Up screen from turn 1. Spans two repos: this app and `readpanda/packages/api-go`.

## Goal
Today's Sign Up (`SignUpScreen.js`) is a four-field form in the middle of the screen. It has a Confirm Password field, reports every problem in an `Alert`, and its error title says "Login failed". On a 13" iPad it fills about a fifth of the display. The redesign puts one-tap sign-up (Apple, Google) first, uses fewer fields, shows errors under the field they belong to, and gives iPad a real layout.

## Out of scope
- The Login screen (stays as built in `specs/ipad-support/` task 7, 15a).
- Terms and Privacy pages (their links show a "coming soon" toast for now; see R7).
- Onboarding after sign-up (the Interest screen, `specs/interests-redesign/`), which opens as today.

## Requirements

### R1. One-tap sign-up first
1. THE screen SHALL show "Continue with Apple" and "Continue with Google" above the email form, with "or use email" between them. On iPad (≥ 700pt) the two buttons SHALL read "Apple" and "Google", side by side.
2. WHEN Apple sign-in succeeds THE app SHALL sign the reader in (creating their account on first use) and continue exactly as a Google sign-up does today.
3. THE new screen SHALL NOT ship without working Sign in with Apple (App Store rule 4.8: Google requires Apple).

### R2. Email form
1. THE form SHALL have three fields: Username (shown with a leading "@"), Email, and Password. There's no Confirm Password field.
2. Each field SHALL have a visible label above it; placeholders are examples only ("yourname", "you@example.com", "At least 8 characters").
3. Password SHALL have a show/hide eye. THE fields SHALL set `textContentType` to `username`, `emailAddress` and `newPassword`, so AutoFill and iOS strong-password suggestions work.
4. Return SHALL move to the next field; Go on the last field SHALL submit when the form is valid.

### R3. Validation
1. Username SHALL be 3–20 characters: letters, numbers, "." and "_", stored lowercase. WHEN it's invalid THE error SHALL say what's wrong, under the field.
2. WHEN the reader leaves the Username field with a valid name THE app SHALL check availability; WHEN it's taken THE error SHALL read "@{name} is taken. Try @{suggestion}" (the suggestion from the server).
3. Email SHALL be checked for a valid shape on leaving the field; a valid email SHALL show a check mark.
4. WHEN the password is under 8 characters THE hint under it SHALL count down ("2 more characters").
5. "Create account" SHALL stay inactive (`surfaceContainerHighest`, no gradient) until every field is valid, and SHALL never open an `Alert`.

### R4. Server errors
1. WHEN `/signup` returns 409 THE error SHALL appear under the field it names (username or email), not in an alert.
2. WHEN any other request error happens THE screen SHALL show one inline error above "Create account" ("Couldn't create your account. Try again."), never titled "Login failed".

### R5. Keyboard
1. iPhone: WHEN a field is focused THE screen SHALL scroll so that field and "Create account" stay above the keyboard.
2. iPad split (17c): with the on-screen keyboard the right column SHALL scroll and the left panel SHALL stay put; with a hardware keyboard nothing SHALL move.

### R6. Layouts
1. **iPhone and windows < 700pt (17a):** one column: brand, "Create your account", the line "Read with friends, one chapter at a time.", Apple, Google, the email form, Create account, then "Already have an account? Log in" at the bottom, then the terms line.
2. **iPad 700–999pt (17d):** the same form, capped at 480pt on a tonal card (`surfaceContainer`, no border), centred. "Have an account? Log in" moves to the top bar.
3. **iPad ≥ 1000pt (17c), including a 13" in portrait:** a 5:7 split. The left panel has the brand, "Read together, a chapter at a time." and three features: "Rooms with a shared pace", "Comments on the page" and "A streak that keeps you going". The right column has "Already have an account? Log in" at its top right, then the form (max 420pt), with "It takes about 30 seconds." as its line. *(Corrected 2026-10-14 to match the drawing: Log in is at the top right of the form column, not at the bottom of the panel.)*
4. THE 17c feature "Rooms with a shared pace" SHALL read "Rooms read the same book. Everyone keeps their own pace, and you can see where they are." *(Changed from 17c's "Each chapter has a due date…", since room schedules are on hold, turn 18.)*

### R7. Terms
1. THE screen SHALL show "By continuing you agree to the Terms and Privacy Policy." below the form, on every layout.
2. WHILE no pages exist, the Terms and Privacy links SHALL show a "coming soon" toast, as the Paywall's do. *(These need real pages before App Store submission.)*

### R8. Backend (api-go)
1. `POST /auth/apple` SHALL accept an Apple identity token, verify it against Apple's public keys with the app's bundle id as audience, and sign in or create the account, returning the same shape as `/auth/google`. It SHALL handle Apple's private-relay email, and an email that's only present on first sign-in.
2. `GET /signup/available?username=` SHALL return `{ available, suggestion }` and SHALL NOT require auth. It SHALL be rate-limited.
3. `/signup`'s 409 SHALL say which field is taken: `{ "error": "...", "field": "username" | "email" }`.
4. THE server SHALL apply the R3.1 username rules and the 8-character password minimum, returning 400 with `field` when they're not met.
5. WHEN an account that signed in with Apple is deleted THE server SHALL revoke its Apple token (App Store guideline 5.1.1(v)), using the Sign in with Apple key (`APPLE_TEAM_ID` = `6F6H5A6JCC`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` in the server's environment, never in the repo). *(Added 2026-10-14.)*

## Open questions
- [x] Backend in this spec, or separate? In this spec.
- [x] Apple not ready? The new screen waits for it (R1.3).
- [x] 17c's due-date copy? Rewritten (R6.4).
- [x] Terms links? A toast for now (R7.2).
- [x] **Username rules (R3.1):** approved. 3–20 characters of letters, numbers, "." and "_", lowercase, for new sign-ups only.
- [x] *(Aside)* `GET /users` turned out to be already admin-only in code (`utils.RequireAdmin`, commit 0563ead); only `ROUTES.md` said "No" auth. The doc was corrected, and the portal's user count, which read `.users` from what is a bare array, was fixed (2026-10-14).
- [x] **New dependency:** `@invertase/react-native-apple-authentication` approved (2026-10-14).
