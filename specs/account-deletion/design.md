# Account Deletion: Design

## Approach
One endpoint, `DELETE /users/me`, does everything in a single transaction, then answers 204. Most per-user rows already go by `ON DELETE CASCADE` from `users`. The work is in the three things that must **not** just cascade (rooms, comments, books), plus `reading_progress`, which has no foreign key at all. The app connects its existing confirmation sheet to the endpoint and reuses the sign-out cleanup.

## Database today (from `scripts/readpanda_schema.sql`)
| Table | Link to `users` | On delete today | Wanted |
|---|---|---|---|
| refresh_tokens, device_tokens, notifications, user_preferences, user_buckets (→ user_bucket_books), book_highlights, book_comment_likes, book_comment_reads, room_members | FK, CASCADE | removed | removed ✓ |
| reading_progress | **no FK** | left behind | delete explicitly |
| rooms (`admin_id`) | FK, CASCADE | the room and every comment in it removed for everyone | hand over to the earliest member first (R5.1) |
| book_comments (`user_id` NOT NULL) | FK, CASCADE | removed, with others' replies (parent cascade) | reassign to "Deleted reader" first (R5.2) |
| books (`user_id`, nullable) | FK, **no action** | **blocks the delete** | set `user_id = NULL` first (R5.3) |

## "Deleted reader"
A reserved user row that deleted people's comments are moved to:
- `uuid = 00000000-0000-0000-0000-000000000000`, `username = 'deleted.reader'`, email `deleted@readpanda.invalid`, `isactive = false`, no password, no social ids.
- Created by the migration (`scripts/migrate_account_deletion.sql`), re-runnable.
- It can't be signed into: no password, and the login, Google and Apple handlers already require a match they can't get. `validateSignup` rejects the reserved name, and `/signup/available` reports it as taken.
- The server's comment queries need no change: they return `username = 'deleted.reader'`. The app maps it for display (below). It never appears in a room's members, because it's never added to `room_members`.

## `DELETE /users/me` (api-go)
In `internal/handlers/users.go`, `DeleteMe`, routed in `cmd/server/main.go` as `DELETE /users/me` (`OPTIONS` too):
1. `utils.ExtractUserID` → uid. Read `apple_refresh_token` for later.
2. `BEGIN`
3. Rooms the user created: for each, find the earliest-joined other member (`room_members` ORDER BY `joined_at`, then `user_id`). If one exists: `UPDATE rooms SET admin_id = that member`, and set their `room_members.role = 'admin'`. Else `DELETE FROM rooms WHERE id = …` (cascades its comments and members).
4. `UPDATE book_comments SET user_id = DELETED_READER WHERE user_id = uid`.
5. `UPDATE books SET user_id = NULL WHERE user_id = uid`.
6. `DELETE FROM reading_progress WHERE user_id = uid`.
7. `DELETE FROM users WHERE uuid = uid` (cascades the rest).
8. `COMMIT` → 204.
9. After the commit: if there was an Apple refresh token and the key is configured, `utils.RevokeAppleToken` (logged on failure). This happens after the commit, so a slow or failed call to Apple never rolls back a deletion the user asked for.

R6.2: access tokens are stateless JWTs, so a deleted user's token still verifies until it expires. Rather than add a per-request user lookup, the refresh tokens cascade away with the user, so the next refresh fails with 401. `apiService.js` already signs out when a refresh fails with 401/403, so another signed-in device drops out at its next refresh. Until then, a stale access token only reads empty results, because nothing belongs to that uid any more. This is accepted.

## App (`readpanda-mobile`)
| File | Change |
|------|--------|
| `src/services/auth.js` | `deleteAccount()`: `DELETE /users/me` with the access token; returns ok / failed |
| `src/screens/profile/SettingsScreen.js` | `handleDeleteAccount`: in-flight state → `deleteAccount()` → on success the same local cleanup as sign-out, minus the server logout call (the account's gone), then the toast. On failure, a toast and stay. |
| `src/screens/profile/SettingsSheets.js` | `ConfirmSheet` gains an optional `children` slot (the subscriber note and link) and a `busy` state for the confirm button |
| `src/stores/commentsStore.js` | `toComment`: WHEN `user_id` is the Deleted reader uuid, `username = 'Deleted reader'` (so initials come out "DR"). Every comment surface (thread sheet, room lobby's Recent comments, Home's New in rooms) reads from here, so nothing else changes |
| Settings' delete `ConfirmSheet` | the new copy (R1.2); for `isPlus`, the subscription note and `Linking.openURL('https://apps.apple.com/account/subscriptions')` |

The sign-out path (`useAuthStore.signOut` and the store resets) already clears the stores and cached data. `Purchases.logOut()` comes via the existing purchases service. Push unregistering isn't needed: `device_tokens` cascade.

## Edge cases
- The user is the only member of every room they created: those rooms are deleted.
- Two members joined at the same moment: the tie breaks on `user_id`, so the result is deterministic.
- The user is a portal admin: deletion is allowed (other admins remain). No special handling.
- Network drops after the server committed: the app sees an error and stays signed in, but its next token refresh fails with 401, and `apiService.js` signs out. Acceptable.
- Deleting twice (a double tap): R3.3 prevents it. A second request with the same token finds no user and is a no-op (still 204).
