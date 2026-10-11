# Home Redesign (turn 16): Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes. Tasks 1–10 are phone-only and can start
before the iPad spec. Tasks 11–12 need `specs/ipad-support/` tasks 1–4.

- [ ] 1. `useHomeSections` skeleton with hero, upNext and popular view models; move `scheduleOf` to `utils/roomSchedule.js` (R1.1, R7.1, R8.1)
- [ ] 2. Per-day page counts in `enhancedStorage` and the yourWeek view model (R4.1–R4.3)
- [ ] 3. Header with the part-of-day greeting (R2.1)
- [ ] 4. `FriendTrack` component (R3.3, R3.6)
- [ ] 5. `ContinueHero`: cover, meta, room chip, track, comments line, CTA, and the solo variant (R3.1–R3.5, R1.3)
- [ ] 6. `YourWeek` card (R4.1, R4.2)
- [ ] 7. `RoomTonightCard` (4 states) and `RoomsTonight`, rewritten as the phone scroller with the join-row fallback (R5.1–R5.4, R1.3)
- [ ] 8. `NewInRooms` with locked redaction and taps to the reader (R6.1–R6.3)
- [ ] 9. `UpNext` tiles and `PopularThisWeek` on phone (R7.1–R7.3, R8.1)
- [ ] 10. `HomePhone` layout, hiding rules, the room-nudge hero for 0 books, new skeleton, removing RoomSwapCard and Curated from the full Home (R1.1–R1.6, R9.1)
- [ ] 11. `HomeLandscape` (16c) with shelf cards for Up next (R9.2, R7.2)
- [ ] 12. `HomePortrait` (16d) (R9.3, R9.4)
- [ ] 13. QA: the Home items in handoff §7 (all 4 card states + the no-rooms join row, hiding, solo, locked counts, the streak matching Profile and the widget, friend markers matching the Room, the 13" portrait layout) (all)

## Notes
