# Handoff: Multi-book Reading shelf (4a, 4b) — readpanda-mobile

Target: **Mavzz/readpanda-mobile @ master**. Replaces the single-book Reading
tab with a shelf of all in-progress books, plus a lighter detail view for
standalone (non-room) books. Reference: `ReadPanda Design Review.dc.html`
sections id="4a" / id="4b"; same DS token mapping as README.md. Fidelity: high.

## Model
- `readingProgressStore` keys by book id: { page, totalPages, percent,
  lastReadAt }. Per-book, regardless of source.
- Book context is separate: room-attached (progress feeds the room's pace
  track + comment unlocking) vs standalone (progress only, never visible to
  others).
- Home hero = most-recently-read book across all contexts (unchanged).
- Rooms tab = per-room standing (unchanged). Reading = my books; Rooms = ours.

## Conditions
- 0 books in progress → first-run 3b.
- 1 room book, 0 solo → the existing single-book pace view may render
  directly (skip the shelf) OR always show the shelf; prefer ALWAYS shelf for
  consistency once this ships.
- ≥1 book → 4a shelf. Tap room book → existing pace/comments view (1b);
  tap solo book → 4b.
- A solo book added to a room keeps its progress entry; its shelf row moves
  groups and gains the room chip.

## 4a — Reading shelf
Header: title "Reading" 26/800 onSurface, subtitle "{n} in progress" 13/500
onSurfaceVariant. No back button (tab root).

Two groups, each with an eyebrow (11/700 uppercase ls1 onSurfaceVariant,
marginBottom 10): "IN A ROOM" then "READING SOLO". Hide a group with no
members. Sort within group by lastReadAt desc.

Row (surfaceContainer, radius 22, padding 14, flex row gap 14, items center):
- Cover 52×74 radius 10 (real cover; hashed-duotone fallback per
  FIRST_RUN_3a_3b.md "Tile imagery").
- Content (flex 1, minWidth 0):
  - Title row: title 15/800 onSurface ellipsized; room rows append a chip —
    surfaceContainerHighest pill, padding 3/9, people icon 11px + room name
    10/700 primary.
  - Progress bar: height 5, radius pill, track surfaceDim (#060d20 in dark),
    fill primary gradient; minWidth 8 so tiny % still reads.
  - Meta 11/600 onSurfaceVariant: "Page {p} of {t} · {relative time}"; room
    rows append " · {n} comments waiting" (primary color) when unread
    unlocked comments exist, or " · Caught up" / " · {n} ch. behind" from
    pace calc.
- The single most-recently-read book overall: elevated (ambient shadow
  0/20/40 rgba(11,19,38,0.4)) + trailing 34px gradient circle with play icon
  (→ ManuscriptScreen directly). All other rows: no trailing control; whole
  row → detail view.

Footer link, centered, marginTop 22: checkmark-done icon + "Finished · {n}
books" 12/700 primary → finished-books list (out of scope here).

## 4b — Solo book detail
Nav: 38px circle back button only (no title in nav).

Header block (padding 16/24/0, flex row gap 18, items center): cover 96×136
radius 14 ambient shadow; right column: eyebrow "READING SOLO" 11/700
uppercase, title 22/800, "Page {p} of {t} · {pct}%" 13/500 onSurfaceVariant.

Pace card (surfaceContainer, radius 24, padding 20, ambient shadow):
- Header row: "Your pace" 13/700 onSurface — "Last read {relative}" 11/600
  onSurfaceVariant.
- Progress bar height 6, same treatment as shelf rows.
- Body 12/500 onSurfaceVariant lh1.45: "About {est} left at your usual pace.
  No one else can see this book's progress." (est from rolling reading-speed
  average; omit sentence if no history.)

Primary CTA: gradient pill "Continue Page {p}" 15/800 onPrimary →
ManuscriptScreen.

Upsell row (surfaceContainerLow, radius 20, padding 14/16, marginTop 28):
36px circle surfaceContainerHigh with people-outline 15px primary; body
"Reading is better together — start a room with this book and your progress
carries over." 12/600 onSurfaceVariant flex 1; action "Start a room" 12/700
primary → Create Room (2b) pre-seeded with this book as currentBook.
Show once per book until dismissed or the book joins a room.

Explicitly ABSENT vs the room view: "Where everyone is" pace track, friend
avatars, comment feed, unlock copy. Never render empty social placeholders
on solo books.

## Out of scope
- Finished-books list screen.
- Multiple rooms reading the SAME book (progress is shared; pace views are
  per-room) — works with this model, no UI change needed.
