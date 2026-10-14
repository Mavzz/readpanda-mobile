# Sign Up Redesign: Design

## Approach
Backend first, then the app, so the screen never ships pointing at endpoints that don't exist. The app side rewrites `SignUpScreen.js` around a small form hook and three layouts chosen by `useLayout().sizeClass`, the same way the iPad spec does it everywhere else.

```
SignUpScreen
 ├─ useSignUpForm()          fields, per-field errors, availability check, submit, server-error mapping
 ├─ OneTapButtons            Apple + Google, stacked with full labels on every size (R1.1)
 ├─ SignUpForm               the three labelled fields, hints, Create account
 └─ layout by sizeClass
     ├─ compact → SignUpPhone   (17a/17b) KeyboardAwareScroll column
     ├─ regular → SignUpCard    (17d) 480pt tonal card, Log in in the top bar
     └─ wide    → SignUpSplit   (17c) SplitLayout: fixed left panel, scrolling right column
```

## Files: app (`readpanda-mobile`)
| File | Change |
|------|--------|
| `src/screens/SignUpScreen.js` | rewritten: layout switch, navigation, sign-in after success (kept from today) |
| `src/screens/signUp/useSignUpForm.js` | new: state, validation (R3), availability on blur, 409/400 → field errors (R4) |
| `src/screens/signUp/SignUpForm.js` | new: labelled fields, eye toggle, hints, check marks, Create account |
| `src/screens/signUp/OneTapButtons.js` | new: Apple (`AppleButton` from the library) + Google |
| `src/screens/signUp/SignUpSplit.js`, `SignUpCard.js`, `SignUpPhone.js` | new: the three layouts |
| `src/screens/signUp/TermsLine.js` | new: the terms sentence, links toast for now |
| `src/services/auth.js` | modified: `appleSignUpLogin()`, `checkUsername(name)`, `emailSignUp` returns the error body's `field` |
| `src/utils/Helper.js` | modified: `SignUpType.Apple` |
| `ios/ReadPanda/ReadPanda.entitlements` | modified: `com.apple.developer.applesignin` = `Default` |
| `package.json` | **new dependency to approve:** `@invertase/react-native-apple-authentication` (native Sign in with Apple; there's no RN built-in) |

## Files: backend (`readpanda/packages/api-go`)
| File | Change |
|------|--------|
| `internal/handlers/users.go` | new `AppleAuth`, `UsernameAvailable`; `CreateUser` returns `field` on 409/400 and validates R3.1 + password ≥ 8 |
| `internal/utils/apple.go` | new: fetch and cache Apple's JWKS (`https://appleid.apple.com/auth/keys`), verify the identity token (iss `https://appleid.apple.com`, aud = bundle id, exp) |
| `internal/config/…` | new config: `APPLE_BUNDLE_ID` |
| `internal/models/models.go` | `LoginTypeApple`; `AppleAuthRequest { identity_token, full_name? }` |
| `cmd/server/main.go` | routes `POST /auth/apple`, `GET /signup/available` (rate-limited via existing middleware, or a small per-IP limiter) |
| `ROUTES.md` | document both routes and the 409/400 `field` |

## Apple sign-in
- **App:** `appleAuth.performRequest({ requestedOperation: LOGIN, requestedScopes: [EMAIL, FULL_NAME] })`, then `POST /auth/apple` with `identity_token` (and `full_name` on first sign-in, the only time Apple sends it). The response is handled exactly like Google's (`signIn`, then preferences, then `isNewUser` → Interest).
- **Server:** verify the token; take `sub` as the Apple user id. Look up by stored Apple `sub` first, then by verified `email` (link to an existing account with the same email, as the Google handler does for verified emails). If neither is found, create the account with a generated username (as Google sign-up does today) and `login_type = apple`. A private-relay email (`@privaterelay.appleid.com`) is stored as is.

## Username availability (R3.2)
- `GET /signup/available?username=mira` → `{ "available": false, "suggestion": "mira.reads" }`. The suggestion tries `{name}.reads`, `{name}_reads` and `{name}{2-digit}` until one is free.
- The app calls it on blur (debounced, with the last result cached per name). A network failure doesn't block: the 409 on submit still catches it.

## Errors (R4)
- 409 / 400 bodies carry `field`; `useSignUpForm` puts the message under that field. No `field` → the inline form error.
- All `Alert.alert` calls are removed from sign-up.

## Keyboard (R5)
- Phone: `KeyboardAvoidingView` (padding) around a `ScrollView`, plus `scrollTo` on focus, so the focused field and Create account stay visible. Fields pass refs for Return → next.
- iPad split: only the right column is inside the keyboard-avoiding scroll; the left panel is outside it. A hardware keyboard produces no keyboard frame, so nothing moves.

## Edge cases
- Apple cancelled by the user: no error, the screen stays.
- Apple hides the email: the relay address is the account's email.
- Name changes between check and submit (someone else takes it): the 409 shows under Username.
- Rotating, or Split View crossing 700 / 1000pt, mid-typing: field state lives in the hook, so the layout switch keeps what's typed.
- An existing username that breaks the new rules: unaffected; the rules apply to new sign-ups only.
