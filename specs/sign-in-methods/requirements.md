# Sign-in Methods: Requirements

Status: Draft, on hold (2026-10-14) <!-- Draft → Approved -->
Design handoff: none (no new screens). It adds a group of rows to Settings (7b) and reuses its rows and `ConfirmSheet`. Spans two repos: this app and `readpanda/packages/api-go`.

## Goal
Accounts are matched by email. Someone who signed up with Google and later taps Continue with Apple gets a second, empty account whenever Apple shares a different address (an @icloud.com one, or Hide My Email), which is the usual case. From then on, Apple sign-in looks as if it lost everything. This lets a signed-in reader connect Apple or Google to the account they're in, so either button signs into the same account from then on.

## Out of scope
- Merging two accounts that already exist. A reader who already has a duplicate can delete it (`specs/account-deletion/`) and then connect.
- Adding or changing a password, or connecting an email and password to a social account.
- Changing the account's email to the connected provider's email.
- Showing connected methods anywhere but Settings.

## Requirements

### R1. Seeing what's connected
**User story:** As a reader, I want to see which sign-in methods work for my account, so I know which button to use.

1. THE Settings screen SHALL show a "Sign-in methods" group with an Apple row and a Google row. Each row SHALL show "Connected" or "Connect" as its value.
2. WHEN the account has a password THE group SHALL also show an "Email and password" row, read only, valued with the account's email.
3. WHILE the methods are loading THE rows SHALL show no value. IF they can't be loaded THEN THE group SHALL be hidden, and the rest of Settings SHALL work as before.

### R2. Connecting
**User story:** As a reader who signed up with Google, I want to connect my Apple ID, so Continue with Apple opens this account instead of a new one.

1. WHEN the reader taps a "Connect" row THE app SHALL open that provider's own sign-in sheet (Apple's or Google's), then connect the result to the signed-in account.
2. WHEN connecting succeeds THE row SHALL change to "Connected" and THE app SHALL show the toast "Apple connected." (or "Google connected.").
3. WHEN the reader closes the Apple sheet THE app SHALL show nothing.
4. IF that Apple ID or Google account already signs into a **different** ReadPanda account THEN THE server SHALL refuse with 409, and THE app SHALL show "That Apple ID is already used by another ReadPanda account." (or "Google account"). Nothing SHALL change on either account.
5. IF the account already has a different Apple ID or Google account connected THEN connecting another one SHALL be refused the same way. Disconnect first (R3).
6. IF any other error happens THEN THE app SHALL show "Couldn't connect Apple. Try again." (or Google), and the row SHALL stay "Connect".
7. WHILE connecting, the row SHALL show progress and not accept a second tap.

### R3. Disconnecting
**User story:** As a reader, I want to disconnect a method I no longer use.

1. WHEN the reader taps a "Connected" row THE app SHALL open a confirmation: "Disconnect Apple? You won't be able to sign in with Apple any more." (or Google), with Disconnect and Cancel.
2. IF it's the account's only way to sign in (no password, and no other provider connected) THEN THE row SHALL NOT offer to disconnect. Tapping it SHALL show the toast "This is the only way to sign in to your account."; THE server SHALL also refuse it with 409.
3. WHEN Apple is disconnected THE server SHALL revoke the stored Apple token (best effort, as in account deletion R4.3) and clear it.
4. WHEN disconnecting succeeds THE row SHALL change to "Connect" and THE app SHALL show "Apple disconnected." (or Google). On failure: "Couldn't disconnect Apple. Try again.", with the row unchanged.

### R4. Signing in after connecting
1. WHEN a connected Apple ID signs in THE server SHALL open the account it's connected to, whatever email Apple shares (this already works: `/auth/apple` matches `apple_sub` first).
2. WHEN a Google account signs in THE server SHALL first look for the account it's connected to (`google_sub`), and only then match by email. Today `/auth/google` matches by email only, so a Google account with a different email can't be connected without this.
3. WHEN a Google sign-in matches an account by email and that account has no Google account connected THE server SHALL connect it (store `google_sub`), as `/auth/apple` already does for Apple.
4. A Google account or Apple ID SHALL be connected to at most one ReadPanda account (unique in the database).

## Open questions
- [ ] Allow disconnecting at all (R3), or connect-only for now? Recommended: allow it, with the R3.2 guard.
- [ ] Show "Email and password" (R1.2)? Recommended: yes, read only, so the reader sees their third way in.
- [ ] Where in Settings: the new group just above Sign out / Delete account (recommended; in the right column on iPad), or in Profile?
- [ ] R4.3 changes today's behaviour slightly: an email account signed into via Google gets `google_sub` stored. Recommended: yes, it's what makes R4.4 enforceable.
