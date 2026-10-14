# Account Deletion: Requirements

Status: Approved <!-- Draft → Approved -->
Design handoff: none (no new screens). It uses Settings' existing Delete account row and confirmation sheet (7b). Spans two repos: this app and `readpanda/packages/api-go`.

## Goal
Anyone who can create an account must be able to delete it from inside the app (App Store guideline 5.1.1(v)). An account made with Sign in with Apple must also have its Apple token revoked. Today Settings → Delete account only shows "isn't available in the app yet — contact support", which App Review rejects. This makes it delete the account for real, without breaking the rooms and conversations other people are part of.

## Out of scope
- A web deletion page (option 2); deletion is fully in the app.
- A grace period or undo. It's immediate and permanent, as the confirmation says.
- Deleting the RevenueCat customer record. The app logs out of RevenueCat and its server-side record is left as it is (decided).
- Cancelling an App Store subscription (only Apple can; see R2.2).

## Requirements

### R1. Starting it
1. Settings → Delete account SHALL open the existing confirmation sheet; confirming SHALL delete the account. There's no second step.
2. THE confirmation SHALL say what happens: "Your reading history, buckets and highlights are deleted. Rooms you created pass to another member, and your comments stay as "Deleted reader". This can't be undone."

### R2. Subscribers
1. WHEN the reader has ReadPanda+ THE confirmation SHALL also say "Deleting your account doesn't cancel ReadPanda+." and show a "Manage subscription" link that opens the App Store's subscription settings.
2. Deleting SHALL NOT be blocked by an active subscription.

### R3. Outcome in the app
1. WHEN deletion succeeds THE app SHALL sign out locally (clear the session, stores and cached data, log out of RevenueCat), return to Login, and show "Your account has been deleted."
2. WHEN deletion fails THE app SHALL stay signed in and show "Couldn't delete your account. Try again." Nothing local is cleared.
3. WHILE the request is in flight THE confirm button SHALL show progress and not accept a second tap.

### R4. Server: what's deleted
1. `DELETE /users/me` (authenticated) SHALL delete the account and everything that's only the reader's: reading positions, highlights, buckets, preferences, notifications, devices, refresh tokens, comment likes and reads, and room memberships. It SHALL return 204.
2. It SHALL run in one transaction: either all of it happens or none does.
3. WHEN the account signed in with Apple and has a stored Apple refresh token THE server SHALL revoke it (R8.5 of signup-redesign). A failed revoke SHALL be logged and SHALL NOT stop the deletion.

### R5. Server: what's kept for others
1. **Rooms the reader created:** WHEN other members remain THE room SHALL pass to the member who joined earliest (they become its creator, role admin). WHEN nobody else is in it THE room SHALL be deleted.
2. **Their comments** in rooms that remain SHALL be kept. Replies by others SHALL be kept.
3. **Books they uploaded as a writer** SHALL stay in the catalogue with no uploader linked.
4. "Deleted reader" SHALL NOT be a username anyone can sign up with or sign in as.
5. WHEN a comment's author is the Deleted reader account THE app SHALL show the author as "Deleted reader" (initials "DR", no avatar), never the raw `deleted.reader` username.

### R6. After
1. WHEN the same email or Apple ID signs up again THE server SHALL treat it as a brand-new account (nothing restored).
2. A deleted account's session SHALL NOT renew: its refresh tokens are gone, so the next token refresh fails with 401 and any other device still signed in is signed out.

## Open questions
- [x] Rooms they created → passed to the earliest-joined member; deleted if empty.
- [x] Their comments → kept as "Deleted reader".
- [x] Books they uploaded → kept, unlinked.
- [x] Subscribers → warning plus a Manage subscription link.
- [x] How the app shows the reassigned comments → mapped to "Deleted reader" in the comments store (R5.5).
- [x] RevenueCat customer record → left as is; the app only logs out.
