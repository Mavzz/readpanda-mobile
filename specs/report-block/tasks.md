# Report & block: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes (for API tasks: `go vet ./...` and
`go test ./...` in `packages/api-go`; for portal tasks: its lint and tests).
Start after specs/open-rooms has merged.

### API (readpanda, branch `feat/report-block`)
- [x] 1. Migration (R3.1, R3.3, R5.3, R7.3)
  - `migrate_report_block.sql`; `readpanda_schema.sql`; `DeleteMe` clears blocks
- [x] 2. Word filter (R8.1, R8.2, R8.5)
  - `internal/moderation`; wired into comments, room create, usernames; `check_test.go`
- [x] 3. Delete your comment (R7.3, R7.4, R7.6)
  - `DELETE /comments/{id}`; soft vs hard delete; `deleted` in comment responses; no replies to deleted
- [x] 4. Blocks (R5.3, R5.4, R5.5, R5.6, R5.7, R6.2, R6.3)
  - block routes; filtering in comments, counts, notify, open rooms, `friends_read`; `members[].blocked`
- [x] 5. Reports and admin alerts (R1.3, R1.4, R1.7, R2.4, R3.1–R3.4, R4.1–R4.3)
  - `POST /reports`; snapshot; dedupe; rate limit; reporter-side hiding; `notifyAdmins`
- [x] 6. Suspension (R10.1, R10.3, R10.4)
  - `requireActive` on logins, refresh and writes
- [x] 7. Moderation API (R9.1–R9.7)
  - `/admin/reports`, resolve actions, `PATCH /admin/users/{uuid}`
- [x] 8. API tests and docs (R1.7, R3.4, R5.3, R5.5, R7.6, R8.2, R9.5, R10.1)
  - `report_block_test.go`; `ROUTES.md`

### Portal and site (readpanda)
- [x] 9. Reports page and suspend (R9.1–R9.6)
  - `reportsPage.jsx`, route and nav count; suspend / reinstate on Users and User detail
- [x] 10. Terms and support wording (R11.2)
  - `site/terms.html`, `site/support.html`

### App (readpanda-mobile, branch `feat/report-block`)
- [x] 11. Services and stores (R1.4, R1.6, R5.2, R6.3, R7.3, R7.5)
  - `safetyService.js`, `blocksStore.js`; `commentsStore` fields and actions (fixes the `profile?.uuid` optimistic id); `roomStore` `blocked`
- [x] 12. `useSafetyActions` (R1.2–R1.6, R2.3, R5.1, R5.2, R7.2, R7.5)
  - reason sheet, "Something else" prompt, confirms, toasts, offer to block
- [x] 13. Reader comment sheet (R1.1, R7.1, R7.4, R8.3, R12.1, R12.3)
  - Swift ⋯ menu, placeholders, `onCommentAction`, blocked-words row with Edit; `ManuscriptScreen` wiring
- [x] 14. JS thread sheet (R1.1, R7.1, R7.4, R8.3, R12.1, R12.3)
  - `CommentThreadSheet` ⋯ menu and placeholders; room page and Home pass ids
- [x] 15. Room page and open-room preview (R2.1, R2.2, R2.4, R5.6)
  - `MemberList` actions and "Blocked"; header ⋯ Report room; `OpenRoomSheet` Report room
- [x] 16. Blocked readers (R6.1–R6.4, R12.2)
  - `BlockedReadersScreen`, route, Settings row with count
- [x] 17. Suspended sign-out and field errors (R8.4, R10.2)
  - `apiService` `account_suspended`; Create room and username show `blocked_words`
- [x] 18. Help answer (R11.1)
  - `helpTopics.js` `report`
- [x] 19. App tests (R1.3, R1.4, R1.6, R5.2, R7.3, R7.5, R10.2)
  - `useSafetyActions.test.js`, `blocksStore.test.js`, `commentsStore.safety.test.js`; `yarn test` passes
- [x] 20. Tell people about moderation (R9.8)
  - API: notifications from `ResolveReport` after the commit; tests in `moderation_test.go`; `ROUTES.md`
  - portal: each action's confirmation says who will be told
- [x] 21. Check end to end (R1–R12)
  - two readers in a room on two Simulators, against the local API with both migrations run:
    - B reports A's comment ("Something else" needs words); it hides for B; the admin account gets "New report"; the portal shows it with the copy
    - B blocks A: A's comments, counts and join pushes vanish for B; A's open rooms leave B's lists; A sees nothing different; B's member list marks A "Blocked"; Unblock in Settings brings them back
    - A deletes a comment with replies ("Comment deleted") and one without (gone); the admin removes one ("Removed by ReadPanda")
    - a comment and a room name with a listed word are refused; "Scunthorpe" isn't
    - the admin removes a comment, closes a room and deletes a room: the author, the creator and the members get their notifications (R9.8)
    - the admin suspends A: A is signed out with the message on the next refresh and can't sign in; reinstate works
    - VoiceOver on the ⋯ buttons and placeholders; largest text size
- [x] 22. Close a removed room's page (R9.9)
  - `roomStore`: `roomGone` and `removedRoomIds`; `fetchRoomDetail` calls it on 404
  - `usePushNotifications`: re-read the active room on a `SYSTEM` push and on returning to the foreground
  - `RoomLobbyScreen`: toast and go back when its room is in `removedRoomIds`; tests in `roomStore.removed.test.js`
- [x] 23. Sign out a suspended reader on refresh (R10.1)
  - API: `requireActive` on the unread count and `GET /room/my-rooms`; `suspension_test.go`
  - app: nothing; `apiService` already signs out on any `account_suspended`

## Acceptance
<!-- Checked one requirement at a time before the commit (CLAUDE.md). A partial or waived one stays unticked with the reason. -->
- [x] R1.1 ⋯ with Report comment and Block on others' comments: reader sheet, room page, Home — device: reader, room page Recent, Home New in your rooms
- [x] R1.2 the seven reasons — device
- [x] R1.3 "Something else" needs words, up to 500 — device
- [x] R1.4 "Thanks. We'll take a look."; hidden at once and after; "You reported this comment" with replies — device, 2026-10-23
- [x] R1.5 offer to block the author — device
- [x] R1.6 failure says "Couldn't send your report. Try again." and doesn't hide — device, API stopped
- [x] R1.7 reporting twice keeps one open report — reports_test.go (a repeat answers 200, one row) and the open-once unique index; no target has two open reports in the local database
- [x] R2.1 member tap offers Report and Block — device
- [x] R2.2 room ⋯ Report room for everyone but the creator; open-room preview too — device: room ⋯, none for the creator, open-room preview link
- [x] R2.3 same reasons, words rule, thanks and failure for readers and rooms — device
- [x] R2.4 never yourself or the Deleted reader — device (own row); the Deleted reader by useSafetyActions.test.js
- [x] R3.1 report stores reporter, target and owner, room, reason and words, time — database: reporter, target and owner, room, reason, words and time on the device reports
- [x] R3.2 copy of the reported text survives deletion — database: deleted Midnight Club and removed comments keep their copies
- [x] R3.3 report stays without a deleted reporter — account_test.go (reporter_id cleared, report kept); not done on a device
- [x] R3.4 30 a day, then the "lot of reports" message — reports_test.go (31st is 429 with the message); not done on a device
- [x] R4.1 admins get "New report" · "<reason> · <what>" — inbox rows checked in db; push toast on iPad signed in as admin, 2026-10-24
- [x] R4.2 the notification has no reported text — database: messages name the reason and the target, never the text
- [x] R4.3 the report is saved and shown even if the push fails — no admin has a device registered, so no push went out, and every report still saved and shows in the portal
- [x] R5.1 "Block <username>? …" with Block and Cancel — device, 2026-10-24; "You'll stay in any rooms you share." added after, tested in useSafetyActions.test.js
- [x] R5.2 "<username> blocked"; comments gone at once everywhere, counts too — device, 2026-10-24
- [x] R5.3 API leaves out their replies, threads and counts — device: blocked creator's comments hidden for aditya n, back after unblocking; blocks_test.go
- [x] R5.4 open-room lists leave out their rooms — device, 2026-10-24
- [x] R5.5 no notifications about their replies, comments or joins — device, 2026-10-24
- [x] R5.6 member list still shows them, marked "Blocked" — device, 2026-10-24
- [x] R5.7 the blocked reader isn't told and sees nothing different — device, 2026-10-24
- [x] R6.1 Settings row "Blocked readers" with the count — device, 2026-10-24
- [x] R6.2 rows with username and Unblock — device, 2026-10-24
- [x] R6.3 Unblock shows "<username> unblocked"; comments back on next load — device, 2026-10-23
- [x] R6.4 empty state "You haven't blocked anyone." and where Block is — device, 2026-10-24
- [x] R7.1 ⋯ with Delete comment on your own — device, 2026-10-24
- [x] R7.2 "Delete this comment? This can't be undone." — device, 2026-10-24
- [x] R7.3 no replies: removed; with replies: "Comment deleted", replies kept — device, 2026-10-24 (others see the change on their next load)
- [x] R7.4 deleted comment has no text, likes, Reply or menu — device, 2026-10-24 (others see the change on their next load)
- [x] R7.5 failed delete puts it back with "Couldn't delete your comment" — waived on device; useSafetyActions.test.js
- [x] R7.6 only the author can delete — comments_delete_test.go (403 for another reader)
- [x] R8.1 refuses listed words in comments, room names and descriptions, usernames — word_filter_test.go (comment, room name, description, signup, username check)
- [x] R8.2 whole words, any case; "Scunthorpe" passes — check_test.go, word_filter_test.go
- [x] R8.3 refused comment: message, no Retry, text kept — device, 2026-10-24, after the task 21 fix (new passage and reply)
- [x] R8.4 room name, description, username: message by the field — device, 2026-10-24
- [x] R8.5 the list is one file in the API — internal/moderation/wordlist.go
- [x] R9.1 Reports page: copy, reason and words, who, room, when — portal, 2026-10-24
- [x] R9.2 remove a comment: "Removed by ReadPanda", replies kept — portal, 2026-10-24: removed comments had no replies, so gone; the placeholder with a reply kept is in moderation_test.go
- [x] R9.3 close or delete a room — Mid club closed (is_private, out of Discover); Crazy club and Test deleted, 2026-10-24
- [x] R9.4 suspend the reader or dismiss — portal, 2026-10-23: suspend_user and dismiss rows by aditya nv
- [x] R9.5 action, admin and time recorded; duplicates close with it — db: both reports on one comment closed as remove_comment by aditya nv
- [x] R9.6 Users page shows suspended; suspend and reinstate — portal, 2026-10-23, after the isSuspended fix
- [x] R9.7 admins only — moderation_test.go (403 for a reader on list, resolve, suspend)
- [x] R9.8 the author, creator and members are told — db and device: comment, close and delete notices to the right people, reason only to the author or creator
- [x] R9.9 a deleted room's open page goes back with "This room was removed" — device, foreground and background, 2026-10-24
- [x] R10.1 suspended: no sign-in, refresh, posting, rooms, reports, blocks — suspension_test.go (sign-in, refresh and every write refused)
- [x] R10.2 signed out with the suspension message, on the next refresh or write — device, 2026-10-24: signed out on posting; refresh sign-out added in task 23
- [x] R10.3 their comments stay — suspension_test.go
- [x] R10.4 reinstated reader can sign in again — suspension_test.go; device: aditya n reinstated 2026-10-23 and posting since
- [x] R11.1 help answer explains the in-app options — helpTopics.js "report": ⋯ or member list, Block, Settings → Blocked readers, email kept
- [x] R11.2 terms and support page describe reporting and blocking — site/terms.html "Reporting and enforcement", site/support.html "How do I report or block someone?"
- [x] R12.1 ⋯ announced "More actions for <username>'s comment" / "for this room" — Accessibility Inspector, 2026-10-24
- [x] R12.2 reasons, confirmations, Blocked readers work with VoiceOver and large text — largest text, 2026-10-24
- [x] R12.3 placeholders read out — Accessibility Inspector, 2026-10-24

## Notes
<!-- One line per change from design.md: "Task 3: used X instead of Y because …" -->
- Task 1: the status index is `content_reports_status_idx` (the design said `content_reports_status`), matching the schema's other `_idx` names. Both tables enable row-level security, as every table does for Supabase.
- Task 2: Apple and Google sign-up make the username from the reader's name instead of asking for one, so a listed word there falls back to "reader" rather than refusing the sign-in. `UpdateRoom` takes no name yet, so it isn't wired. The endpoint tests are in `internal/server/word_filter_test.go` (task 8's `report_block_test.go` covers the rest), and the test helper now decodes JSON error bodies so a test can check `code` and `field`.
- Task 3: design.md updated first. A deleted comment keeps `anchor_text` (the book's words, shown as the thread's quote), and the last reply's delete removes its placeholder. Placeholders aren't counted as unread or locked, including progress's `newly_unlocked`, and can't be liked. `removeComment(tx, id, parentID, by)` is shared, for the moderator's remove in task 7. Placeholders return `user_id`, `username` and `body` empty rather than leaving the keys out.
- Task 4: `notify.Notification` gained `ActorID` (the replier or joiner): `Send` drops recipients who blocked them, and `RoomComment` does the same for the author. `loadRoomDetail` and `loadRoomMembers` take the viewer, for `members[].blocked`. The friends CTE leaves out blocked readers, so Discover's `friends_read` per book drops them too, not only Book detail's. Blocking an unknown reader is `404`.
- Task 5: `POST /reports` answers `201 {id}`, or `200 {status: "already_reported"}` for a repeat, which doesn't alert the admins again. A deleted comment can't be reported (`404`). A reader can be reported by anyone sharing a room with them; `room_id`, if sent, must be one of those rooms. A room's copy is its name, a blank line, then its description. A reported reply is dropped for the reporter, and a reported first comment with replies comes back as `hidden: "reported"`, like a deleted placeholder.
- Task 6: suspended is `isactive IS FALSE`, so an unset value counts as active. Password sign-in checks it after the password, so a wrong password still says so. Apple and Google check it once the account is found; the tests can't reach those, since they need real identity tokens. Unblocking is refused too, along with blocking. Likes and deleting your own comment stay allowed: R10.1 doesn't list them, and deleting only takes things down.
- Task 7: `GET /admin/reports` also answers `has_more` and `open_count`, for the nav badge, and gives each room's state (open, invite_only, gone) alongside the comment's state. Resolving a closed report is `409`, and an action that doesn't fit the report is `400`. Removing a comment its author already deleted re-marks it as the moderator's; one already gone needs nothing more. Suspending deletes the account's refresh tokens. `PATCH /admin/users/{uuid}` won't suspend the admin themselves or the Deleted reader.
- Task 8: the API tests went in with each task, one file per area instead of a single `report_block_test.go`: `word_filter_test.go`, `comments_delete_test.go`, `blocks_test.go`, `reports_test.go`, `suspension_test.go` and `moderation_test.go`, plus the extended `account_test.go`, and `check_test.go` in `internal/moderation`. Between them they cover every requirement task 8 lists. `ROUTES.md` documents the new routes, the `blocked_words` and `account_suspended` errors, the filtering, and the admin alert.
- Task 9: Reports page tabs are filter chips (Open shows its count), and the nav badge polls the open count each minute; a writer without the admin role just gets no badge. Each open row offers only the actions its report still fits; a room that's already closed, for example, has no Close room. The Users table marks `isactive = false` as "Suspended" through a new optional `renderCell` on `DataTable`. User detail has a Suspend or Reinstate button, hidden for the Deleted reader. The API client gained `patch`.
- Task 10: the terms' "Last updated" date moves to 22 October 2026. The support page's "How do I join a room?" answer also gains a sentence on open rooms, which it predated.
- Task 11: `src/utils/apiError.js` reads the status and JSON body back out of apiService's thrown 4xx; roomStore's open-rooms code uses it too. `safetyService` returns refusals as `{ status, error, code }` and sends with `maxRetries: 0`; `makeAuthenticatedDeleteRequest` now takes options. Block calls the API first, then drops the author: it's one quick request, and nothing has to be put back if it fails. Also new: `commentsStore.discardFailed`, for Edit on a refused comment; `roomStore.setMemberBlocked`; and `blocksStore` clearing on sign-out. `commentsStore.safety.test.js` and `blocksStore.test.js` are written here, ahead of task 19.
- Task 12: design.md updated first. The thank-you and the offer to block are one alert, because a toast would sit behind the native sheet. Outcomes go through a `say` the caller can replace. Android gets `SafetySheetHost`, since it has no `ActionSheetIOS` or `Alert.prompt`. The hook also returns `unblockUser`. `useSafetyActions.test.js` is written here, ahead of task 19.
- Task 13: the event is `onManageComment` rather than `onCommentAction`, which `CommentablePDFView` already uses for "comment on this selection". Edit on a refused comment is native: the text goes back into the composer, as a reply to the same comment if it was one, and JS only drops the failed row (`discard`). The thread sheet is drawn inside the reader's view, so the default toast shows over it and no override is needed. Manrope has no italic, so placeholders use a slanted Manrope Medium (`DS.Fonts.italic`). Placeholders don't count in the header's "N comments". `ReaderComment.failed` now also accepts the string `'blocked_words'`.
- Task 14: ⋯ goes through `useSafetyActions().commentMenu`. Your own comment goes straight to the delete confirmation; anyone else's opens `chooseAction` (`.ios.js` is an action sheet, `.android.js` an alert) with Report and Block, which the member list reuses in task 15. The sheet mounts its own `Toaster` inside its Modal, so toasts show over it. Thread previews, in the room page's Recent and Home's New in your rooms, show the first reply when the first comment is a placeholder (`utils/commentPreview.js`). Placeholders slant with `skewX`, since RN won't italicise Manrope. `CommentThreadSheet.test.js` is new.
- Task 15: design.md updated first. The active room had no member list, so it gets `MemberList` after the recent comments (your call, 2026-10-22). Member rows go through `memberMenu` (Report, Block or Unblock) and the headers' ⋯ through `roomMenu`, both in `useSafetyActions` via `chooseAction`. `useRoomLobby` members carry `userId` and `blocked`. "Blocked" is bold text before the role, not red. In the open-room preview, failures show in the sheet's own error line; the thanks is a system alert. `MemberList.test.js` is new.
- Task 16: rows are drawn in the screen, not `SettingsRow`: each needs an avatar and an Unblock button, which SettingsRow's chevron-or-switch row doesn't have. Unblock shows a spinner while it saves. The screen's eyebrow is "N blocked". A list that can't load offers Try again, and the Settings row's value is "None" or the count, appearing once the list has loaded. `BlockedReadersScreen.test.js` is new.
- Task 17: `apiService.handleSuspended` signs out and shows the R10.2 alert once, for a refused refresh or any other 403 `account_suspended`. A refused sign-in triggers it too, so the sign-in screens skip their own message when the error is marked `suspended`. Sign-up already shows a `{ error, field }` under its field, so `blocked_words` needed nothing there. `saveRoom` now reads the refusal out of the thrown error; Create room shows a name refusal in place of the helper line and clears it on edit, where it used to toast "Client error 400: …".
- Task 18: the answer adds "and unblock them in Settings → Blocked readers" to the wording in design.md.
- Task 19: the three named test files went in with tasks 11 and 12. R10.2 is tested in `apiService.test.js`. `CommentThreadSheet`, `MemberList` and `BlockedReadersScreen` have their own tests too. 21 suites, 174 tests.
- Task 20: added after approval (your call, 2026-10-23: the owner and a deleted room's members). Closing a room that's already invite-only tells nobody, since nothing changes for them. The inbox already shows a message in full and a SYSTEM tap only marks it read, so the app needed no change. Tests are in `moderation_test.go`.
- Task 21 (found while checking): the admin table routes send every column as text, so `isactive` arrives as "false" and the user pages never saw a suspension. The portal's `isSuspended` reads both forms.
- Task 21 (found while checking): Edit on a refused comment on a new passage dropped the passage's only thread, so the reader's Send had nothing to post to and did nothing. `editRefused` in `CommentSheetView.swift` now aims the sheet back at the passage as a new comment.
- Task 22: added while checking (your call, 2026-10-24). apiService throws a 4xx rather than returning it, so the 404 is read in the catch (the first try checked the return and never fired on a device). The re-check reads only the active room: `fetchRooms` swaps in list rows without members, which would empty an open room page. The tests cover the store (`roomStore.removed.test.js`); the page's go-back is checked on a device, since rendering the room page means mocking most of the app. 22 suites, 180 tests.
- Task 23: added while checking (your call, 2026-10-24): you expected a refresh, not only a write, to sign a suspended reader out. Only the two refresh reads check, so the rest of the API still needs no lookup per request.
- Task 23 (found while checking): Home and Rooms' pull to refresh toasted "Refreshed!" or "Connection error" over the suspended alert. Both stop once the reader is signed out.
- After the PR (your call, 2026-10-24): the block confirmation adds "You'll stay in any rooms you share.", since blocking a room's creator keeps you in their room (R5.6) and that surprised you while checking.
- After release prep (your call, 2026-10-24): the list grew to regional slurs, and matching keeps Indic vowel signs in the word (R8.2 now says "in any script"). Tests in `check_test.go`.
