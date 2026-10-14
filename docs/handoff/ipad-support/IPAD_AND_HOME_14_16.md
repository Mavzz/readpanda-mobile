# Turns 14–16: iPad layouts + Home redesign (14a–14k, 15a–15o, 16a–16d)

Specs are in sections `14a`–`16d` of `ReadPanda Design Review.dc.html`. Turns 14 and 15 give every phone screen from turns 1–11 an iPad layout. Turn 16 redesigns Home on **both** iPhone and iPad and replaces 1a and 14b. The app is React Native and targets an 11-inch iPad (1194×834pt landscape, 834×1194pt portrait).

**Read this first:** 14b (iPad Home) and 1a (phone Home) are superseded by 16a–16d. Build Home from turn 16 only.

### Resolved questions
- [x] **Tabs on iPad (R3.2):** a bottom bar with the same 4 tabs, centered, icon and label side by side (§1). No side rail, so phone and iPad share one navigator.
- [x] **Reader landscape (R5.2):** a two-page spread by default (14g). The Scroll/Spread switch lets you change it, and each orientation remembers its own choice.
- [x] **Comments in the reader (R5.4):** a sheet with the phone's detents, capped at 640pt and centered (14j). The Room screen (14i) is the exception: comments sit in its right column.
- [x] **Which screens get an iPad design:** all of them (14a–14k, 15a–15n). Below 700pt (Slide Over / Split View), every screen falls back to the phone layout.
- [x] **Minimum iPadOS:** the same as the iPhone deployment target, so one build covers both. The extra-large widget (14k) needs iPadOS 15+ and Pencil ink (14h) needs PencilKit 13+, so both are already covered by any current target. *Engineering to confirm.*

## 1. Global rules

### Parity
- Each iPad screen has exactly the same actions, sections and states as its phone screen. Only layout and presentation change.
- iPad-only additions approved so far: the reader's **Scroll / Spread** switch (14f–14g), **Apple Pencil ink** (14h) and the **extra-large widget** (14k). Anything else (keyboard shortcuts, drag and drop, hover states, Pencil settings) needs its own proposal first.

### Breakpoints
- The layout follows the window width, not the device. Use `useWindowDimensions()`, not `Platform.isPad`.
- `< 700pt` (Slide Over, narrow Split View): the phone layout, unchanged.
- `700–999pt`: the **portrait** layout (16d, 15o…). `≥ 1000pt`: the **landscape** layout (16c, 15c…).
- "Portrait" and "landscape" are layout names, chosen by **width only**. The 13" iPad in portrait is 1032pt wide, so it gets the landscape layout on purpose: 7fr / 5fr leaves about 560 / 400pt for the columns, which fits. Split View widths fall into the same buckets.
- One exception: the reader's Scroll / Spread default follows the real orientation (width > height), not width. A 13" in portrait still opens in Scroll.

### Layout
- Page side padding: 40–44 in landscape, 36 in portrait.
- Grids gain columns rather than scaling covers up:
  - Browse/cover grid: 3 → 5 (portrait) / 6 (landscape). Covers stay about 160pt wide.
  - Buckets: 2 → 3 / 4.
  - Popular row: 3 → 5 / 6–8.
- Text columns are at most 640pt wide. Two-column pages split about 60/40 (`minmax(0,3fr) minmax(0,2fr)` or `7fr / 5fr`).
- Detail pages use a fixed header with a scrolling list: identity on the left at 320pt, content on the right at up to 640pt (15e, 15f).
- Tab bar: the same 4 tabs as the phone (Home · Discover · My Books · Rooms). It's centered, with the icon and label side by side, gap 56 (48 in portrait), on glass `rgba(23,31,51,0.7)` + blur.

### Presentation
- **Form sheet:** short tasks that are full screen on the phone (create room, new bucket) open as a centered 540pt sheet over the dimmed screen. Use `presentation: 'formSheet'`.
- **Popover:** bottom sheets that belong to a single control (the reader's room chip, sort) open as a popover anchored to that control, with the same options.
- **Sheets that cover content** (comments 14j) keep the phone's detents (medium/large), capped at 640pt wide and centered.

### Tokens
These are unchanged from README.md: surfaces `#0b1326 / #131b2e / #171f33 / #222a3e`, track `#060d20`, text `#dae2fd / #d6c3b2`, accent `#ffddb8 → #ffb95f`. iPad page titles are 30/800 with letter-spacing -0.6. Eyebrows are 11/700, uppercase, letter-spacing 1. Device frame in the HTML: 12pt bezel, radius 44 (chrome only).

## 2. Turn 16: Home (iPhone + iPad)

### Why
The old Home showed one book and one list, so most of the screen was empty. The new Home fills it with data the app already stores. **No new backend features.**

### Section order (the same on every layout)
1. **Header:** "Thursday evening" (weekday + part of day) 13/600 · "Hi, {firstName}" 26/800 (30 on iPad) · bell with badge · 38pt avatar → Profile.
2. **Continue** hero card.
3. **Your week:** the streak, plus 7 day dots.
4. **Rooms tonight:** one card per room the user belongs to, including rooms with no book or a different book (see card states). Users with no rooms get the **join-by-code row** here instead (the 3a row, unchanged).
5. **New in your rooms:** the latest 3 comments across rooms.
6. **Up next:** books in progress, excluding the hero book.
7. **Popular this week.**

### Hiding rules
- A section with no data is **hidden**. Never show it as an empty state.
- A reader with no rooms doesn't see section 5, and section 4 becomes the join-by-code row. The hero then drops the room chip and the friend markers, and shows pace copy instead ("About 3 h left").
- With 0 books in progress and 0 rooms, use first run (3a phone, 15b iPad) instead of this screen.
- With 0 books in progress but at least 1 room, keep this screen, but the hero becomes the room nudge: the room's book with "Start reading" (→ reader p. 1), or, if the room has no book, "{Room} needs a book" with "Choose the book" (→ Room 2a / 14i). This is the same rule as FIRST_RUN_3a_3b.md.
- Your week: hidden until the user has read on at least 1 day.

### Continue hero
- Card `#131b2e`, radius 28, padding 18 (phone) / 22 (iPad), shadow `0 20px 40px rgba(11,19,38,0.4)`.
- Cover: 96×140 on phone, 138×204 on iPad, radius 14.
- Room chip: `people` icon + room name, 10–11/700 `#ffddb8` on `#222a3e`. Shown only if the book is in a room. If the book is in several rooms, show the one with the nearest deadline (the same rule as the reader chip).
- Title 21/800 (28 on iPad) · "Ch. 2 · p. 31 of 746" · "About 3 h left" (remaining pages × pace).
- **Friend progress track:** 28pt tall. The track is 5pt, `#060d20`. The fill shows your progress. 20–22pt avatars sit at each member's % position:
  - Yours is `#ffddb8` and reads "You".
  - Each one has a 3pt knockout ring in the card color.
  - Show up to 3 members. With more, show the 2 nearest ahead plus "+N".
- Line below: "Priya & Tom are ahead · **3 comments waiting at p. 34**". The count is unlocked comments only.
- CTA "Continue reading" with a `play` icon:
  - Phone: full width, 50pt.
  - iPad: hugs its content, 48pt, aligned to the bottom of the card.
  - Opens the reader at the saved anchor.

### Your week
- Card `#131b2e`, radius 22, padding 16.
- Eyebrow "Your week". On the right: `flame` + "6-day streak" 13/800 `#ffddb8`. iPad portrait shortens this to "6 days".
- 7 columns covering the last 6 days plus today:
  - Read day: 30pt circle `#ffb95f`.
  - Missed day: `#3a2c18`.
  - Today, not read yet: a 2pt `#ffb95f` ring.
  - Labels are 10/700 single letters, and today is labelled "Today" in `#ffddb8`.
- Footer copy:
  - "{pages} pages this week. Read tonight to make it {n+1}."
  - After reading today: "{pages} pages this week."
  - Never shaming copy when the streak breaks.
- Data source: the same reading-day record Profile's streak uses (7a/15l).

### Rooms tonight
- Phone: a horizontal scroller of 250pt cards. iPad: a stacked list inside one card.
- Each card has:
  - The room name, 14/800.
  - On the right, "N new" (`#ffb95f`, unlocked comments) or "Caught up" (`#d6c3b2`).
  - "{Book} · Ch. 4 due in 3 days" 12/600.
  - A progress bar for your position within the scheduled range, with a 2×11 `#dae2fd` tick at the deadline.
  - "2 of 3 ahead of you" with stacked 22pt avatars.
- **Card states** (drawn in 16e):
  - *Reading together:* as above.
  - *Room reads a book you haven't started:* "{Book} · Ch. 4 due in 3 days" plus a "Start" pill (`#222a3e`, `#ffddb8`) instead of the bar → reader p. 1. This replaces the old "your room is reading something else" card.
  - *Room has no book yet:* "No book picked yet" 12/600 plus a "Choose the book" pill → Room. This replaces the old "room but no book" card. No bar or avatars.
  - *No schedule:* the book name only, no bar.
- Order: nearest deadline first, then rooms with no book, then rooms with no schedule. Tap → Room (2a / 14i).
- "All rooms" → Rooms tab.

### New in your rooms
- The 3 newest comments from all rooms. Each row has:
  - A 30pt avatar.
  - "Name · p. 34 · Book" 11/700.
  - The body, 13/600, 2 lines max.
- A comment beyond your position is blurred (`blur(4px)` → on RN, a blurred overlay or a redacted bar), with a `lock-closed-outline` icon. It isn't tappable.
- Tap an unlocked comment → reader at that page with the room's layer on.
- "See all" → that room's comment list.
- On phone the rows sit in one card. iPad landscape: one card in the right column. iPad portrait: 2 cards side by side.

### Up next
- Books in progress, excluding the hero, ordered by last opened. Max 3 on phone, 3 on iPad landscape, 5 on portrait.
- Phone and iPad portrait: cover tiles (104×150 phone, 176pt tall portrait), with the title 12/700 and a 4pt bar underneath.
- iPad landscape: shelf cards (`#131b2e`, radius 22, 50×72 cover, title, bar, "p. 298 · Yesterday").
- Tap → the reader. "My Books" → the My Books tab.

### Where the old Home cards went
- "Your room is reading something else" → a Rooms tonight card state (above).
- "Room but no book yet" → a Rooms tonight card state, or the hero if you have no book in progress.
- Join-by-code row → section 4 for users with no rooms. Users with rooms join from the Rooms tab header (1c / 15i).
- Curated for you → Discover only (8a / 15c). It stays on first run (3a / 15b). On a full Home, Popular this week does that job.

### Popular this week
- The same data as Discover's Popular. Phone: 4 covers 80×116 in a horizontal scroll. iPad landscape: 6 columns, 140pt tall. Portrait: 5 columns.
- Tap → Book detail (8c / 14c).

### Layouts
- **16a/16b, phone:** one column, padding 24, gap 22–26 between sections.
- **16c, iPad landscape:** 2 columns, `7fr / 5fr`, gap 20.
  - Left column (books): Continue → Up next → Popular.
  - Right column (people): Your week → Rooms tonight → New in your rooms.
  - Both columns scroll together in a single ScrollView.
- **16d, iPad portrait:**
  - Continue, full width.
  - Your week and Rooms tonight in a 2-column row.
  - New in your rooms as 2 cards.
  - Up next and Popular at 5 across.

### Data needs
| Field | Source |
|---|---|
| activeBook + anchor, pace | readingProgressStore (the same record as the reader and widgets) |
| memberProgress per room | roomStore |
| readingDays[] (last 7), pagesThisWeek | the progress record (same as the Profile streak) |
| rooms[] with schedule {targetChapter, dueDate}, unreadUnlockedCount | roomStore |
| latestComments[3] with anchor + unlocked flag | messageStore; unlocked = anchor ≤ my position |
| popularThisWeek | Discover endpoint |

## 3. Turn 14: iPad, core screens

| ID | Screen | Phone source | iPad change |
|---|---|---|---|
| 14a | Onboarding: genres (portrait) | onboarding | Centered 520pt column. The cover row below the chips updates live as you pick. Landscape uses the same centered column. |
| 14b | ~~Home (landscape)~~ | ~~1a~~ | **Superseded by 16c/16d.** |
| 14c | Book detail | 8c | Cover on the left at 280pt, content in a 620pt column, fits without scrolling. Action order: Start reading · Read with a room · + (add to bucket). |
| 14d | See all: cover grid | 10c | 6 columns landscape / 5 portrait, covers about 160pt. The search field moves next to the title. |
| 14e | See all: buckets | 10e | 4 columns. Bigger fan, still 3 covers. "New bucket" is the last tile, and the header button does the same thing. |
| 14f | Reader: Scroll (portrait) | 6a | Default with no bars. **PDF, no reflow:** pages are stacked vertically, each scaled to fit 600pt wide, centered on `#0b1326`, with 16pt gaps. Pinch zooms (from 1× up to 3×); rotating resets to fit-600. Comment dots go in the margin outside the page. Tap the center to show the 6a bars. |
| 14g | Reader: Spread (landscape) | 6a | Two-page book layout: facing PDF pages side by side, scaled to fit the height (about 540pt each). Page 1 sits alone on the right, so even pages are always on the left, as in the printed book. Swipe or tap the edges to turn pages. The top bar holds the room chip and the Scroll/Spread switch on one row. **No Aa:** PDFs have no font settings, so Aa is removed from the reader on iPad and iPhone. Page numbers follow the book's real numbering. |
| 14h | Reader: Apple Pencil ink | — (approved iPad-only) | See §5. |
| 14i | Room | 2a | 6-week schedule strip. "Where everyone is" shows member dots along the book (yours has an amber ring). Comments go in the right column, up to your position only, with a count for the rest. In portrait, comments move under the schedule. |
| 14j | Comments sheet | 6b | The same sheet and detents, capped at 640pt and centered. The passage stays visible. The room chip switches rooms. Shared ink shows as an image. ✎ in the reply field lets you answer in handwriting. |
| 14k | Widget: extra large | 13d + 13c | See §6. |

### Reader mode rules (14f–14g)
- Switch: Scroll / Spread in the top bar.
- **Each orientation remembers its own choice.** Default: portrait = Scroll, landscape = Spread.
- Both modes render the original PDF pages. Nothing reflows, so the anchor is always a page plus a rect in page coordinates.
- Both modes share one anchor (page + selection + bounds), so switching modes or rotating never loses your place.

## 4. Turn 15: iPad, remaining screens

| ID | Screen | Phone source | iPad change |
|---|---|---|---|
| 15a | Login | 1d | Brand panel on the left, form in a 400pt column on the right. Portrait: both stacked in a 440pt column. |
| 15b | Home: first run | 3a | The same content and order. Hero + 3 nudges take the left 60%, Curated sits in the right column, and everything fits on one screen. After the first book is opened → 16c. |
| 15c / 15o | Discover (landscape / portrait) | 8a | Search beside the title. Curated buckets: 4 per row (3 in portrait). Popular: 8 (5 in portrait). |
| 15d | My Books | 8b | The same sections and limits. 2 shelf cards side by side. Buckets in a 5-column row instead of a sideways scroll, with "New bucket" last. Then the Finished link. |
| 15e | My bucket | 9a | Fan, name, Continue and + fixed on the left. The list scrolls on the right (max 640pt). Edit / swipe-to-remove / finished-sinks / ⋯ are unchanged. |
| 15f | Curated bucket | 9b | The hero turned sideways: text on the left, fan on the right. 6-column grid. No tab bar (it's pushed from Discover). |
| 15g | See all: currently reading | 10d | A 2-column list. Recent sort, "With rooms" / "Solo" groups, Paused rows dimmed, play button only on the top row. |
| 15h | New bucket: 3 picked | 11b | 6 columns. The same controls: Create (gold once named), stack of the last 3 picks, search, My library / Discover, "Selected · N". The 11c fly-in is unchanged. |
| 15i | Rooms | 1c | A 2-column card grid. Join-by-code + New room move to the header row on the right. The invite card stays last. Tap → 14i. |
| 15j | Create room | 2b | Form sheet, 540×620pt, over the dimmed Rooms tab. Steps 2–3 continue inside the same sheet. |
| 15k | Room: just created | 2a | The two setup jobs side by side and numbered. Once a book is picked, the left card becomes the 14i schedule card. |
| 15l | Profile | 7a / 7c | Identity + stats on the left, reading life on the right. Finished covers show a full row of 8. Rooms in 2 columns. A new user's right side shows the 15b first-run cards. |
| 15m | Settings | 7b | The same rows in two 500pt columns. Sign out / Delete account stay last, both with confirmation. |
| 15n | Reader: comment layer | 10a | A popover anchored to the "With [Room]" chip instead of a bottom sheet. It changes only which comments are visible, never your position. |

## 5. Apple Pencil ink (14h)
- Pencil writes and a finger scrolls (`PKCanvasView` with `drawingPolicy = .pencilOnly`). There's no ink mode to turn on.
- The tool palette appears when the Pencil touches the page and fades 3s after the last stroke.
- Highlighter strokes snap to the line of text. Circles and handwriting stay as drawn.
- Each stroke is anchored to the nearest text, like a comment, in PDF page coordinates, so it survives zoom, rotation and switching to Spread.
- **Ink is private.** Long-press a stroke:
  - **Share to room** → posts a comment with an image of the stroke.
  - **Convert to text** → a typed private note.
- Needs a native module. The RN side stores strokes as `{bookId, anchor, pkDrawingData}`.

## 6. Extra-large widget (14k)
- iPad only, `.systemExtraLarge`. 13d (large, tonight) on the left; on the right, 13c shelf rows plus the bucket.
- The same fallbacks as WIDGETS_13a_13f.md: no room → panel hidden, no bucket → Curated.
- Up to 4 `Link` targets (each at least 44pt).

## 7. QA checklist
- [ ] 13" iPad in portrait (1032pt) renders 16c, and the reader still opens in Scroll.
- [ ] Rooms tonight: test all 4 card states, plus a user with no rooms (join row).
- [ ] Below 700pt (Slide Over / Split View), every screen renders the phone layout.
- [ ] Rotating keeps scroll position and reader anchor. Each orientation keeps its own Scroll/Spread choice.
- [ ] No iPad screen has an action that its phone screen lacks (apart from Spread, Pencil and 14k).
- [ ] Create room and new bucket open as form sheets. The room chip and sort open as popovers.
- [ ] No app UI text line is wider than 640pt. (This doesn't apply to book pages, which are PDFs.)
- [ ] Scroll: each page is fit to 600pt at 1× zoom. Spread: even pages on the left, and page 1 on its own.
- [ ] Home: each section hides when it has no data. A solo reader sees no room UI. 0 books → first run.
- [ ] Home: comment counts and previews never include comments beyond the user's position.
- [ ] Home streak matches Profile's streak and the widget's flame.
- [ ] Home friend markers match 14i's "where everyone is" for the same room.
