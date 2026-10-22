# Report & block: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes (for API tasks: `go vet ./...` and
`go test ./...` in `packages/api-go`; for portal tasks: its lint and tests).
Start after specs/open-rooms has merged.

### API (readpanda, branch `feat/report-block`)
- [ ] 1. Migration (R3.1, R3.3, R5.3, R7.3)
  - `migrate_report_block.sql`; `readpanda_schema.sql`; `DeleteMe` clears blocks
- [ ] 2. Word filter (R8.1, R8.2, R8.5)
  - `internal/moderation`; wired into comments, room create, usernames; `check_test.go`
- [ ] 3. Delete your comment (R7.3, R7.4, R7.6)
  - `DELETE /comments/{id}`; soft vs hard delete; `deleted` in comment responses; no replies to deleted
- [ ] 4. Blocks (R5.3, R5.4, R5.5, R5.6, R5.7, R6.2, R6.3)
  - block routes; filtering in comments, counts, notify, open rooms, `friends_read`; `members[].blocked`
- [ ] 5. Reports and admin alerts (R1.3, R1.4, R1.7, R2.4, R3.1–R3.4, R4.1–R4.3)
  - `POST /reports`; snapshot; dedupe; rate limit; reporter-side hiding; `notifyAdmins`
- [ ] 6. Suspension (R10.1, R10.3, R10.4)
  - `requireActive` on logins, refresh and writes
- [ ] 7. Moderation API (R9.1–R9.7)
  - `/admin/reports`, resolve actions, `PATCH /admin/users/{uuid}`
- [ ] 8. API tests and docs (R1.7, R3.4, R5.3, R5.5, R7.6, R8.2, R9.5, R10.1)
  - `report_block_test.go`; `ROUTES.md`

### Portal and site (readpanda)
- [ ] 9. Reports page and suspend (R9.1–R9.6)
  - `reportsPage.jsx`, route and nav count; suspend / reinstate on Users and User detail
- [ ] 10. Terms and support wording (R11.2)
  - `site/terms.html`, `site/support.html`

### App (readpanda-mobile, branch `feat/report-block`)
- [ ] 11. Services and stores (R1.4, R1.6, R5.2, R6.3, R7.3, R7.5)
  - `safetyService.js`, `blocksStore.js`; `commentsStore` fields and actions (fixes the `profile?.uuid` optimistic id); `roomStore` `blocked`
- [ ] 12. `useSafetyActions` (R1.2–R1.6, R2.3, R5.1, R5.2, R7.2, R7.5)
  - reason sheet, "Something else" prompt, confirms, toasts, offer to block
- [ ] 13. Reader comment sheet (R1.1, R7.1, R7.4, R8.3, R12.1, R12.3)
  - Swift ⋯ menu, placeholders, `onCommentAction`, blocked-words row with Edit; `ManuscriptScreen` wiring
- [ ] 14. JS thread sheet (R1.1, R7.1, R7.4, R8.3, R12.1, R12.3)
  - `CommentThreadSheet` ⋯ menu and placeholders; room page and Home pass ids
- [ ] 15. Room page and open-room preview (R2.1, R2.2, R2.4, R5.6)
  - `MemberList` actions and "Blocked"; header ⋯ Report room; `OpenRoomSheet` Report room
- [ ] 16. Blocked readers (R6.1–R6.4, R12.2)
  - `BlockedReadersScreen`, route, Settings row with count
- [ ] 17. Suspended sign-out and field errors (R8.4, R10.2)
  - `apiService` `account_suspended`; Create room and username show `blocked_words`
- [ ] 18. Help answer (R11.1)
  - `helpTopics.js` `report`
- [ ] 19. App tests (R1.3, R1.4, R1.6, R5.2, R7.3, R7.5, R10.2)
  - `useSafetyActions.test.js`, `blocksStore.test.js`, `commentsStore.safety.test.js`; `yarn test` passes
- [ ] 20. Check end to end (R1–R12)
  - two readers in a room on two Simulators, against the local API with both migrations run:
    - B reports A's comment ("Something else" needs words); it hides for B; the admin account gets "New report"; the portal shows it with the copy
    - B blocks A: A's comments, counts and join pushes vanish for B; A's open rooms leave B's lists; A sees nothing different; B's member list marks A "Blocked"; Unblock in Settings brings them back
    - A deletes a comment with replies ("Comment deleted") and one without (gone); the admin removes one ("Removed by ReadPanda")
    - a comment and a room name with a listed word are refused; "Scunthorpe" isn't
    - the admin suspends A: A is signed out with the message on the next refresh and can't sign in; reinstate works
    - VoiceOver on the ⋯ buttons and placeholders; largest text size

## Notes
<!-- One line per change from design.md: "Task 3: used X instead of Y because …" -->
