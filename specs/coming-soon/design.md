# Coming soon: Design

## Approach
Five small features, mostly built from screens the app already has. The new server work is search and the account endpoints, in
`readpanda/packages/api-go`.

**Search (R1).** `GET /books/search?q=` in `handlers/books.go`: one query over
the same rows as `/books/all`, `ILIKE '%q%'` on title and author name (with
`%`, `_` and `\` in `q` escaped), ordered by a `CASE` rank (title prefix 0,
title contains 1, author 2) then title, `LIMIT 50`. A `q` under 2 characters
after trimming is `400`. On Discover, the existing search pill
(`DiscoverScreen.js:121`) becomes a `TextInput` in the same pill. While the
query is 2 or more characters, a `useBookSearch(query)` hook debounces it
(300ms), calls the endpoint, drops answers to older queries, and the screen
renders the results as BookGrid's cover grid in place of its sections.
Clearing the field, or the clear button, returns the sections. Results reuse
the BookGrid cover (progress or finished check from the reader's own shelf).

**Finished (R2).** A new BookGrid source, `finished`: the shelf's books where
`started && progressPct >= 100` (the rule `useProfileData` already uses),
newest `lastReadAt` first, titled "Finished". It needs no network.
`BookGrid` is added to the My Books stack, so both Finished links
(`MyBooksScreen.js:225`, `ReadingScreen.js:209`) navigate to
`BookGrid { source: 'finished' }`.

**Rename (R3).** A `RenameSheet` in `SettingsSheets.js`, beside ConfirmSheet
and ChoiceSheet: a title, one `TextInput` (40 characters max, filled in,
selected), Save and Cancel. Save calls the store's existing `renameBucket`;
the sheet shows a spinner while it runs and stays open with the error on
failure. It replaces `Alert.prompt` in `MyBucketScreen.js:248` and
`BucketGridScreen.js:105`.

**Add books (R4).** `CreateBucketScreen` gets an add mode:
`CreateBucketScreen { bucketId }`. In it:
- the name field is replaced by "Add to <bucket>";
- the bucket's current book ids come from the buckets store; those covers show
  a check and are disabled;
- the button reads "Add" (gold once something's picked) and calls a new
  `addBooksToBucket(bucketId, ids)` in `bucketsStore`
  (`POST /users/me/buckets/{id}/books`), then `goBack()`.

The order stays the server's: new books come after the existing ones (R4.2).
The picker's search stays the local filter it is in New bucket (R4.3).

**Edit profile (R5).** A new `EditProfileScreen` in `src/screens/profile/`,
on the main stack as `EditProfile`, opened from the Profile pill. It uses
`SettingsGroup`/`SettingsRow`:
- Display name (value: the name, or "Add a name")
- Username (`@name`)
- for `login_type === 'email'` accounts, Email (address) and Password (••••••)
- otherwise, a plain row "Signed in with Apple" / "Signed in with Google"

Each editable row opens a `FieldSheet` (a generalised RenameSheet with one or
more fields and an error line):
- **Display name:** one field, 40 characters.
- **Username:** one field. It checks `GET /signup/available` 400ms after
  typing stops, and shows "Available", or "Taken. Try <suggestion>" with the
  suggestion tappable. Save is enabled only while the name is available.
- **Email:** new email and current password.
- **Password:** current, new, and new again. Save is enabled when they match
  and the new one is 8 or more characters.

`authService` gets `updateProfile`, `changeEmail` and `changePassword`. On
success `authStore.updateUser` stores the returned fields.

**Username change on the device (R5.4).** Every stored key ends in
`::<username>`, so before `updateUser` switches the name,
`enhancedStorage.renameAccountData(old, new)` copies each `::old` key to
`::new` and deletes the old one (beside `clearAccountData`). The in-memory
stores already hold the data, so nothing reloads.

**Server (R5.8).** In `handlers/users.go`:
- **`PatchMe`:** `display_name` (trimmed, 0–40, empty to NULL) and/or
  `username` (`validateSignup`'s username rule; `usernameTaken`, excluding
  self, gives `409 { field: "username", suggestion }`). It updates in one
  statement, catches the unique-violation race as 409, and returns
  `{ user_id, username, display_name, email, login_type }`.
- **`ChangeEmail`:** only for `login_type = 'email'`, otherwise `403`.
  `DecryptPassword` failing gives `403`. A valid address taken by another
  account gives `409`. Otherwise it updates and returns the profile.
- **`ChangePassword`:** only for `email` accounts. Wrong current password:
  `403`. New one shorter than 8: `400`. Otherwise `CryptPassword`, then
  `204`. Other sessions aren't signed out (no email to warn with yet).
- **Auth responses** (sign-up, login, Google, Apple, refresh) add `user_id`
  (`users.uuid`), `display_name` and `login_type`.
- **Migration:** `scripts/migrate_profile.sql` adds
  `users.display_name text NULL`.

Comments and rooms read usernames from `users` at query time, so they follow
a rename with no further change.

**RevenueCat (R6).** `purchasesService.identify(userId)` and
`subscriptionStore.start(userId)` take the account id. `authStore` passes
`user.user_id` and skips `start` while it's missing (an older stored session).
The token refresh stores `user_id`, and `start` runs then (R6.2). Nobody has
bought ReadPanda+ yet, so no RevenueCat customer needs moving.

## Files
| File | Change |
|------|--------|
| `api-go/internal/handlers/books.go` | new `SearchBooks` |
| `api-go/internal/handlers/users.go` | new `PatchMe`, `ChangeEmail`, `ChangePassword`; `user_id`, `display_name`, `login_type` in auth responses |
| `api-go/internal/models/models.go` | `DisplayName *string` on User; response fields |
| `api-go/internal/server/router.go` | the four routes |
| `api-go/internal/server/*_test.go` | search ranking/escaping/400; profile 200/409/403/400; auth response fields |
| `api-go/scripts/migrate_profile.sql`, `ROUTES.md` | new column; route docs |
| `src/services/bookService.js` | `searchBooks(q)` |
| `src/hooks/useBookSearch.js` | new: debounce, stale-answer guard, states |
| `src/screens/DiscoverScreen.js` | live search field; results in place of sections |
| `src/screens/BookGridScreen.js` | `finished` source |
| `src/navigation/MyBooksStackNavigator.js` | `BookGrid` route |
| `src/screens/MyBooksScreen.js`, `ReadingScreen.js` | Finished links navigate |
| `src/screens/profile/SettingsSheets.js` | `RenameSheet` / `FieldSheet` |
| `src/screens/MyBucketScreen.js`, `BucketGridScreen.js` | RenameSheet; + opens add mode |
| `src/screens/CreateBucketScreen.js` | add mode |
| `src/stores/bucketsStore.js` | `addBooksToBucket` |
| `src/screens/profile/EditProfileScreen.js` | new |
| `src/navigation/MainStackNavigator.js` | `EditProfile` route |
| `src/screens/profile/ProfileScreen.js` | Edit profile pill navigates; display name in header |
| `src/services/auth.js` | `updateProfile`, `changeEmail`, `changePassword`; store `user_id`, `display_name`, `login_type` |
| `src/stores/authStore.js` | RevenueCat by `user_id`; username change moves stored data |
| `src/utils/enhancedStorage.js` | `renameAccountData(old, new)` |
| `src/services/purchasesService.js`, `src/stores/subscriptionStore.js` | identify by account id |

## Data and state
- Server: `users.display_name` (new, nullable). Four new routes.
- App: the stored user profile gains `user_id`, `display_name`, `login_type`.
- A username change moves the `::<username>` keys (R5.4).
- RevenueCat's app user id becomes the account id.

## Navigation
- `BookGrid` added to the My Books stack (`source: 'finished'`).
- `CreateBucketScreen` takes an optional `bucketId` (add mode).
- New `EditProfile` route on the main stack.

## Edge cases
- **Search while offline:** "Search needs a connection."; editing the query
  tries again. A late answer to an older query is dropped.
- **Search query with `%` or `_`:** escaped, so it matches literally.
- **Finished with nothing finished:** the link doesn't show (as today).
- **Rename to the same name:** Save stays disabled.
- **Add where every picked book is already in:** they can't be picked.
- **Two devices renaming:** last write wins.
- **Username taken between check and save:** 409, "That username was just
  taken.", with the suggestion.
- **Username differing only by case from the current one:** it's stored
  lowercase, so it's a no-op and Save stays disabled.
- **Changing username while offline:** the save fails ("Couldn't save. Check
  your connection."). Nothing is queued: account changes need the server's
  answer.
- **Apple account with a hidden relay email:** no Email row (R5.7).
- **Older stored session with no `user_id`:** RevenueCat waits for the next
  refresh (R6.2); the ReadPanda+ state shows the free plan until then.
- **Comment and room caches on this device** still hold the old username
  until their next fetch; the next Room or reader open refreshes them.

## Alternatives considered
- **Searching on the device over `/books/all`:** downloads the whole
  catalogue each time; slow as it grows.
- **A separate search screen:** the 8a field sits on Discover. Results in
  place keep Discover's back button and state.
- **Blocking username changes for subscribers:** moving RevenueCat to the
  account id now, before anyone has paid, is simpler and permanent.
- **Email change with a confirmation link:** the server has no way to send
  email yet. The current password confirms it instead.
