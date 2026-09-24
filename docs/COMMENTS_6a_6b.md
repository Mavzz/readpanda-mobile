# Handoff: In-book comments (6a, 6b) — readpanda-mobile

Target: **Mavzz/readpanda-mobile @ master**, ManuscriptScreen. Reference:
`ReadPanda Design Review.dc.html` sections id="6a" / id="6b". Adds passage-
anchored, room-scoped comments to the paginated reader. Fidelity: high.

## Model
- Comment: { id, roomId, bookId, page, anchor (text range or null for
  page-level), body, authorId, createdAt, parentId (one level: null or a
  root comment id), likes }.
- Room-scoped: visible only inside its room. Solo books (no room): zero
  comment affordances — no chrome icon, no gutter, no scrubber ticks.
- Spoiler rule: a comment is UNLOCKED when comment.page <= user's
  furthest-read page. Locked comments are never positioned, previewed, or
  counted per-page — only as one aggregate "later in the book" number.

## 6a — Reader overlay
Chrome bar: back, title (ellipsized), chatbubble-ellipses icon (primary —
opens page-level composer), search. Icon shows a dot when unread unlocked
comments exist in the book.

Passage highlights: anchor ranges tinted primary — unread rgba(primary,
0.28), read rgba(primary, 0.14). Page text/layout otherwise untouched.

Gutter dots (right page margin, vertically aligned to the anchor's first
line):
- Unread cluster: 22px circle, primary gradient, count 10/800 onPrimary.
- Read: 12px dim dot (neutral #b9b3a8 on paper). 
- All comments sharing an anchor = one dot. Tap → 6b sheet for that thread.

Scrubber (existing progress bar):
- Ticks 2×10pt primary at each unlocked-comment page position (≤ current
  region density: merge ticks closer than 4pt).
- Status row: page counter left; center "{n} waiting behind you" 11/700
  primary with chatbubble icon (unread unlocked count; hide at 0); right
  "{m} later in the book" 11/600 muted (locked count; hide at 0).

Composer entry: long-press selection → system-style "Comment" pill →
6b sheet, empty state, composer focused, selection as quote. Chrome icon →
same sheet anchored to page (no quote block). Room picker row appears in
the composer only when the book belongs to >1 room (default: last used).

## 6b — Thread sheet
Half-height bottom sheet (max 62% screen), surfaceContainer, radius 28 top,
grabber. Reader dims to 45% behind; the anchored highlight stays visible.

- Header: "{n} comments · Page {p}" 14/800 — room chip (people icon + name,
  10/700 primary on surfaceContainerHighest pill).
- Quote block: surfaceContainerLow, 3px primary left border, radius
  0/12/12/0, serif italic 11.5/1.5 muted. Omit for page-level threads.
- Comment row: 30px avatar; name 12/800 + "p. {page} · {relative}" 10/600
  muted + 6px primary unread dot; body 13/500 lh1.5; actions row heart+count
  and Reply 11/700 (liked = primary).
- Replies: single indent (40pt), 26px avatar, no further nesting. Collapse
  past 2 replies to "{k} more replies".
- Sort roots by page position then createdAt.
- Composer pinned bottom: pill field "Add to the thread…" + 40px gradient
  send button. Posting inherits the thread's anchor + room scope.
- Opening a thread marks its comments read (clears dots/ticks/counts).

## PDFKit implementation notes
- Anchor = { pageIndex, selectionString, bounds } from PDFSelection; restore
  via PDFDocument.findString scoped to the page. Key comments to a file hash
  (not just bookId) so different editions never mis-anchor.
- Comment pill: UIEditMenuInteraction on PDFView, action alongside Copy.
- Highlights: runtime-only PDFAnnotation(.highlight), accent at 0.28/0.14
  alpha per selectionsByLine() rect; never written into the document.
- Gutter dots: UIKit overlay buttons positioned via pdfView.convert(rect,
  from: page); recompute on PDFViewPageChanged + zoom notifications (cheap
  with usePageViewController pagination). Prefer overlay over custom
  PDFAnnotation subclasses for hit-testing/badges.
- Scrubber ticks: pure UIKit (pageIndex / pageCount fractions) — no PDFKit.
- Thread sheet: UISheetPresentationController, custom ~62% detent; on
  present, pdfView.go(to: selection).

## Out of scope
- Reactions beyond like; comment editing/deletion flows; push notification
  copy (widget handoff 5a/5b already consumes unlockedUnreadCount).
