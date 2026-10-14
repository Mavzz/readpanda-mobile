# Home Redesign (turn 16): Requirements

Status: Approved (2026-10-11)
Design handoff: `docs/handoff/ipad-support/IPAD_AND_HOME_14_16.md` §2 (16a–16d). Supersedes 1a (phone Home) and 14b.
Depends on: `specs/ipad-support/` tasks 1–4 (`useLayout`, `SplitLayout`) for the iPad layouts. The phone layout can ship first.

## Goal
Today Home shows one book and one list, so most of the screen is empty. The new
Home fills it with data the app already stores: your week, your rooms, new
comments, what's up next and what's popular. It applies to iPhone and iPad.
There are no new backend features.

## Out of scope
- First run (0 books in progress) stays as it is on phone (3a). Its iPad layout is 15b in `specs/ipad-support/`.
- Backend changes (see the open question about room schedules).

## Requirements

### R1. Structure and hiding
1. THE Home screen SHALL show, in this order: Header, Continue, Your week, Rooms tonight, New in your rooms, Up next, Popular this week.
2. WHEN a section has no data THE section SHALL be hidden (never an empty state).
3. WHEN the reader belongs to no rooms THE screen SHALL hide New in your rooms, SHALL show the join-by-code row (the 3a row, unchanged) in place of Rooms tonight, and the hero SHALL drop the room chip and friend markers and show pace copy instead.
4. WHEN the reader has 0 books in progress and 0 rooms THE app SHALL show first run (3a / 15b) instead of this screen.
5. WHEN the reader has 0 books in progress but at least 1 room THE hero SHALL become the room nudge: the room's book with "Start reading" (→ reader p. 1), or, if the room has no book, "{Room} needs a book" with "Choose the book" (→ Room). This is the same rule as FIRST_RUN_3a_3b.md.
6. Curated for you SHALL NOT appear on the full Home. It stays on first run and in Discover.

### R2. Header
1. THE header SHALL show "{Weekday} {morning|afternoon|evening|night}" (13/600), "Hi, {firstName}" (26/800, or 30 on iPad), the bell with its badge, and a 38pt avatar that opens Profile.

### R3. Continue hero
1. THE hero SHALL show the active book: cover (96×140 phone / 138×204 iPad), title, "Ch. {n} · p. {p} of {total}" and "About {t} left" (remaining pages × pace).
2. WHEN the book is in a room THE hero SHALL show a room chip. With several rooms, it SHALL show the room with the nearest deadline (the same rule as the reader chip).
3. WHEN the book is in a room THE hero SHALL show the friend progress track: your fill, up to 3 avatars at each member's % position (yours labelled "You"). With more members, it SHALL show the 2 nearest ahead plus "+N".
4. THE line under the track SHALL name who's ahead and "**{n} comments waiting at p. {p}**", counting **unlocked comments only**.
5. THE "Continue reading" CTA SHALL open the reader at the saved anchor. On phone it's full width at 50pt; on iPad it hugs its content at 48pt, aligned to the bottom of the card.
6. Friend markers SHALL match the Room screen's "Where everyone is" for the same room.

### R4. Your week
1. WHEN the reader has read on at least 1 of the last 7 days THE card SHALL show a flame with "{n}-day streak" ("{n} days" on iPad portrait), plus 7 day dots (read / missed / today-not-yet ring) labelled with single letters and "Today".
2. THE footer SHALL read "{pages} pages this week. Read tonight to make it {n+1}.", or "{pages} pages this week." once today has been read. It SHALL never use shaming copy.
   WHEN no per-day page counts exist yet THE footer SHALL drop the "{pages} pages this week" clause rather than show 0. Page counts are stored locally per day next to `reading_days`.
3. THE streak SHALL match Profile's streak and the widget's flame (one source: `enhancedStorage` reading days).

### R5. Rooms tonight
1. THE section SHALL show one card for **every** room the user belongs to. Order: rooms with a deadline (nearest first), then rooms with no book, then rooms with no schedule.
2. Every card SHALL show the room name (14/800) and "N new" (unlocked) or "Caught up". The rest depends on the card's state (16e):
   - **Reading together** (you're reading the room's book, and it has a schedule): "{Book} · Ch. {n} due in {d}", a progress bar for your position within the scheduled range with a tick at the deadline, and "{a} of {b} ahead of you" with stacked avatars.
   - **Not started** (the room has a book you haven't opened): "{Book} · Ch. {n} due in {d}" plus a "Start" pill (`surfaceContainerHighest` / `primary`) instead of the bar, which opens the reader at p. 1. This replaces RoomSwapCard.
   - **No book:** "No book picked yet" plus a "Choose the book" pill that opens the Room. No bar or avatars. This replaces RoomNudgeHero's card form.
   - **No schedule:** the book name only, no bar.
3. Tapping a card SHALL open that Room. "All rooms" SHALL open the Rooms tab.
4. Phone: a horizontal scroller of 250pt cards. iPad: a stacked list inside one card.

### R6. New in your rooms
1. THE section SHALL show the 3 newest comments across all the reader's rooms: avatar, "Name · p. {p} · Book", and the body (2 lines max).
2. WHEN comments exist beyond the reader's position THE section SHALL show one locked line with their count ("{n} more past your page"), never text, and it SHALL NOT be tappable. *(Changed 2026-10-14 while building: the server sends only a count for locked comments, with no author, page or text, so 16b's blurred per-comment rows can't be drawn honestly.)*
3. Tapping an unlocked comment SHALL open its thread on Home (the thread sheet). "See all" SHALL open the Room of the newest row. *(Changed 2026-10-14: opening the reader at an earlier comment's page would save that page as the reader's position and move them backwards; the reader has no "visit without saving" mode yet.)*

### R7. Up next
1. THE section SHALL show the books in progress, excluding the hero, ordered by last opened: max 3 (phone and iPad landscape), 5 (iPad portrait).
2. Phone and iPad portrait: cover tiles with the title and a 4pt bar. iPad landscape: shelf cards (50×72 cover, title, bar, "p. {p} · {relative day}").
3. Tapping a book SHALL open the reader. "My Books" SHALL open the My Books tab.

### R8. Popular this week
1. THE section SHALL show Discover's Popular data: 4 covers in a horizontal scroll on phone, 5 columns on iPad portrait, 6 columns at 140pt on iPad landscape. Tapping one SHALL open Book detail.

### R9. Layouts
1. **Phone (16a/16b):** one column, padding 24, gap 22–26.
2. **iPad landscape (16c):** two columns at 7fr/5fr with a gap of 20. Left: Continue → Up next → Popular. Right: Your week → Rooms tonight → New in your rooms. One shared ScrollView.
3. **iPad portrait (16d):** Continue full width; Your week and Rooms tonight side by side; New in your rooms as 2 cards; Up next and Popular at 5 across.
4. WHEN the window is < 700pt THE phone layout SHALL be used.

## Open questions
- [x] Old Home cards: RoomSwapCard → the *Not started* state; RoomNudgeHero → the *No book* state, or the hero when there are 0 books; join-by-code → Rooms tonight for users with no rooms; Curated for you → first run and Discover only.
- [x] Room schedules: the API doesn't send them yet, so rooms without one use the *No schedule* card state. When the API adds `schedule`, cards upgrade to *Reading together* / *Not started* with no app change.
- [x] **Pages this week:** reading days are stored as dates only, with no page counts. Proposal: keep a local per-day page counter next to `reading_days` in `enhancedStorage` (no backend). Until the counter has data, the footer drops the "{pages} pages" clause rather than showing 0. Approved.
- [x] **"See all" in New in your rooms:** "that room's comment list" is ambiguous when the 3 rows come from different rooms. Decision: open the Room (14i) of the newest row.
- [x] Visuals: `16a`–`16e` (including the card states) are now in `ReadPanda Design Review.dc.html`.
