# Home Redesign (turn 16): Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes. Tasks 1–10 are phone-only and can start
before the iPad spec. Tasks 11–12 need `specs/ipad-support/` tasks 1–4.

- [x] 1. `useHomeSections` skeleton with hero, upNext and popular view models; move `scheduleOf` to `utils/roomSchedule.js` (R1.1, R7.1, R8.1)
- [x] 2. Per-day page counts in `enhancedStorage` and the yourWeek view model (R4.1–R4.3)
- [x] 3. Header with the part-of-day greeting (R2.1)
- [x] 4. `FriendTrack` component (R3.3, R3.6)
- [x] 5. `ContinueHero`: cover, meta, room chip, track, comments line, CTA, and the solo variant (R3.1–R3.5, R1.3)
- [x] 6. `YourWeek` card (R4.1, R4.2)
- [x] 7. `RoomTonightCard` (4 states) and `RoomsTonight`, rewritten as the phone scroller with the join-row fallback (R5.1–R5.4, R1.3)
- [x] 8. `NewInRooms` with locked redaction and taps to the reader (R6.1–R6.3)
- [x] 9. `UpNext` tiles and `PopularThisWeek` on phone (R7.1–R7.3, R8.1)
- [x] 10. `HomePhone` layout, hiding rules, the room-nudge hero for 0 books, new skeleton, removing RoomSwapCard and Curated from the full Home (R1.1–R1.6, R9.1)
- [x] 11. `HomeLandscape` (16c) with shelf cards for Up next (R9.2, R7.2)
- [x] 12. `HomePortrait` (16d) (R9.3, R9.4)
- [ ] 13. QA: the Home items in handoff §7 (all 4 card states + the no-rooms join row, hiding, solo, locked counts, the streak matching Profile and the widget, friend markers matching the Room, the 13" portrait layout) (all)

## Notes
- Built 2026-10-14. Lint passes and the Metro bundle builds; nothing has been seen running yet.
- Data: per-day page counts are new in `enhancedStorage` (`recordPagesRead`, called from `saveReadingProgress`; forward steps of 1–30 pages only, two weeks kept; `getPagesRead(7)` returns null until something's counted, so the footer drops the number). `localDay` is exported. `scheduleOf` moved to `utils/roomSchedule.js`. `useHomeData` now loads comments and member progress for every room's book.
- Chapters: the hero says "Ch. 2 · p. 31 of 746" using the chapter starts the reader stores from the PDF outline (`getBookChapters`); with no outline it's just the page. Room cards say "p. N due…", since a schedule's target is a page.
- "About 3 h left" uses the reader's measured pace (`getPaceMinPerPage`) or 1.5 min/page until there's enough data.
- Rooms tonight: with schedules on hold (turn 18) every room is *noBook*, *notStarted* or *noSchedule*. The *together* state (bar, deadline tick, "2 of 3 ahead") is wired to `scheduleOf` and will show once rooms carry a schedule. **Start** calls `startBook(…, { roomId })`, so the room's book becomes the hero, then opens the reader with that room's layer.
- New in your rooms: see R6.2/R6.3, changed. Comments are deduplicated per book, because the comments store is keyed by book: two rooms reading the same book share one list.
- Section titles are turn 16's 16pt titles with a link (`SectionHeader`), not the old eyebrow headers.
- Not built: the iPad first-run Home (15b). It isn't in either spec's task list (home-redesign rules it out, and ipad-support has no 15b task), so first run still uses the phone layout on iPad. Needs a decision on which spec owns it.
