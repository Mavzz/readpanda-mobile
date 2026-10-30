# Coming soon: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` and `yarn jest` pass (and, for server tasks,
`go test ./...` in `readpanda/packages/api-go`).

- [x] 1. Server: `GET /books/search` (R1.6)
  - `SearchBooks`, route, escaping, ranking, 400; tests; ROUTES.md
- [x] 2. Search on Discover (R1.1, R1.2, R1.3, R1.4, R1.5, R1.7)
  - `searchBooks`, `useBookSearch` (debounce, stale guard) with tests; live
    field and results grid on Discover; iPad layout (field beside the title)
- [x] 3. Finished books (R2.1, R2.2, R2.3)
  - BookGrid `finished` source; route in the My Books stack; both links
- [x] 4. Rename sheet (R3.1, R3.2, R3.3, R3.4)
  - `RenameSheet`; MyBucket and BucketGrid use it
- [x] 5. Add books from a bucket (R4.1, R4.2, R4.3, R4.4)
  - CreateBucketScreen add mode; `addBooksToBucket`; + opens it
- [x] 6. Server: profile endpoints and auth response fields (R5.8, R5.3, R5.5, R5.6)
  - migration; `PatchMe`, `ChangeEmail`, `ChangePassword`; `user_id`,
    `display_name`, `login_type` in sign-up/login/Google/Apple/refresh; tests;
    ROUTES.md
- [x] 7. App stores the new fields; RevenueCat by account id (R5.8, R6.1, R6.2)
  - `auth.js` keeps `user_id`, `display_name`, `login_type`; `identify` /
    `start` take the id; refresh fills it in for older sessions; tests
- [x] 8. Edit profile screen and sheets (R5.1, R5.2, R5.3, R5.5, R5.6, R5.7)
  - `EditProfileScreen`, `FieldSheet`; route; Profile pill; display name in
    the Profile header
- [x] 9. Username change moves stored data (R5.4)
  - `renameAccountData` with tests; called before `updateUser` switches the name
- [x] 10. Device pass: iPhone and iPad, all of the above, offline cases (all)

## Acceptance
<!-- Checked one requirement at a time once every task is done, before the
commit. One line per criterion: "- [x] R1.1 <short> — how it was checked".
A partial or waived one stays unticked with the reason. -->
- [x] R1.1 Typing shows matching books in place — device
- [x] R1.2 Clearing brings the sections back — device
- [x] R1.3 No matches message — device
- [x] R1.4 Offline message, retries on edit — device; useBookSearch tests
- [x] R1.5 Result opens Book detail — device
- [x] R1.6 Server search: match, rank, limit, 400 — search_test.go against Postgres
- [x] R1.7 Placeholder "Title or author" — device
- [x] R2.1 Finished grid from both links, newest first — device (seeded finished books)
- [x] R2.2 Check on covers, opens Book detail — device
- [x] R2.3 Works offline — device, Airplane Mode
- [x] R3.1 Rename sheet, Save rules — device
- [x] R3.2 New name everywhere — device
- [x] R3.3 Failure keeps sheet and old name — device, Airplane Mode
- [x] R3.4 Same sheet on iOS and Android — device (iOS; Android uses the same component)
- [x] R4.1 Picker in add mode, existing books marked — device
- [x] R4.2 Added after existing, back to the bucket — device after the server fix; buckets_add_test.go
- [x] R4.3 Picker search filters, as in New bucket — device
- [x] R4.4 Failure keeps picks — device; buckets_add_test.go (500 on a failed insert)
- [x] R5.1 Edit profile rows by account type — device
- [x] R5.2 Display name rules, shown on Profile — device
- [x] R5.3 Username rules, availability, taken-at-save — device (incl. an older Google username)
- [x] R5.4 New username everywhere; device data moved — device, two devices (syncAccount)
- [x] R5.5 Email change with current password — device; profile_test.go
- [x] R5.6 Password change with current password — device; profile_test.go
- [x] R5.7 Apple/Google: no Email/Password rows — device (Google account)
- [x] R5.8 Server endpoints and auth fields — profile_test.go against Postgres
- [x] R6.1 RevenueCat by account id — code (purchasesService.identify) and authStore.account tests; device check waived: no RevenueCat account yet, so Plus is off in this build
- [x] R6.2 Older sessions get the id at launch or on refresh — authStore.account tests (adoptAccount, syncAccount); device check waived as R6.1

## Notes
<!-- One line per change from design.md: "Task 3: used X instead of Y because …" -->
Task 1: search reads nullable text columns through COALESCE (test books have no description or genre); `/books/all` would fail on such rows too. Server tests run against local Postgres (TEST_DATABASE_URL).
Task 2: results keep the previous answer on screen while the next query loads, so the grid doesn't blank between keystrokes.
Task 4: one `FieldSheet` (in SettingsSheets) serves rename and every Edit profile sheet; `RenameBucketSheet` wraps it for both bucket screens.
Task 5: `addBooksToBucket` isn't optimistic (the picker waits and keeps the picks on failure); it re-reads the bucket tiles after (My bucket re-reads its own page on focus).
Acceptance R4: `POST /users/me/buckets/{id}/books` never added anything (Postgres refused the untyped `$1` in its subquery, and the handler swallowed the error and answered 200). Fixed in the server with a typed parameter and a 500 on a failed insert; `buckets_add_test.go` covers it.
Task 7: a token refresh hands its account fields to `authStore.adoptAccount`, which fills in a session stored before them and starts RevenueCat then; `apiService` requires the store at call time to avoid an import cycle.
Task 8: `SettingsRow` shows its chevron only when it has an `onPress`, for the read-only "Signed in with …" row (every existing row has one).
Acceptance R5: older Google accounts have the Google name as username (capitals, spaces, sometimes past 20), so the field has no hard `maxLength` and flags a username that breaks the rule. Edit profile also reads the new `GET /users/me` on opening, so a session from before this build gets its sign-in kind (the "Signed in with Google" row) and id without waiting for a token refresh; R5.8 updated.
New Google accounts now get a rule-fitting username as Apple's do (`socialUsername`, `withSuffix` in the server's users.go); before, the raw Google name was used, with its clash suffix added past 20. Existing accounts keep their names; Edit profile can fix one.
Acceptance R5.4: a username changed on one device now reaches the others: `authStore.syncAccount` reads `GET /users/me` at launch, on coming to the foreground and on opening Edit profile, and moves the device's data to the new name before switching to it.
Once RevenueCat is set up: check that a new customer's App User ID is the account's UUID, and that a username change keeps the same customer (R6 on device).
Deploy: `scripts/migrate_profile.sql` before the server; the server before this app build (an older server sends no `user_id`, so ReadPanda+ would wait).
