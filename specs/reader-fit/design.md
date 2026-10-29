# Reader fit: Design

## Approach
**Which box is shown.** PDFKit can show any of a page's boxes
(`PDFView.displayBox`). The reader keeps every page's crop box as it is (saved
comment and highlight positions are fractions of it, R1.2). It sets each page's
**art box**, in memory only, to the trimmed area, and shows `.artBox`. PDFKit
lays the pages out, fits them, draws them and hit-tests them in that box, and
page-space coordinates (anchors, selections, `PDFDestination`s) are unchanged.

**Finding the box (R1).** `PageTrim.find(in:)` runs on a background queue
against its own `PDFDocument` made from the same data. PDFKit documents aren't
safe to share across threads, and the one on screen stays the main thread's.
For each page:
- Pictures come from `PageImageScanner.imageAreas(of:)` (page theme). If one
  covers ≥ 70% of the page, the page is a cover or scan and is skipped (R1.1).
- Text comes from `page.selection(for: cropBox)?.bounds(for: page)`, the box
  round every glyph, including running heads and page numbers.
- A page with neither is blank and skipped.
- The page's text and picture box is stored as fractions of its crop box, so
  pages of different sizes combine.

The book's box is the union of those fractions, padded by 4pt (in page points)
so the theme's edge cover (`ThemedPdfPage`) never reaches a glyph, and clipped
to the page. If nothing was measured, or the box is more than 95% of the crop
box's width, the result is "don't trim" (R1.3). Applied, each page's art box
is the box's fractions laid on that page's crop box (R1.4).

**When (R2).** The file's SHA-256 (`documentHash`, already worked out in
`notifyLoadComplete`) keys the result in `UserDefaults` as
`reader_fit_v1_<hash>`: four fractions, or a "don't trim" marker. The `v1` is
there so a later change to the finder can ignore old results.
- On load, a remembered box is applied before `showDocument` puts the document
  on screen, so the first frame is trimmed (R2.2).
- Otherwise the book shows untrimmed and `PageTrim.find` starts. When it
  finishes it's stored, and applied only if `pdfView.document` is still the same
  document (R2.3), through the same keep-your-place path a rotation uses (R6.2).
- The work item is cancelled when a new document loads or the view goes, and
  checks for cancellation between pages (R2.3).
- It runs at `.utility`, below the scroll's priority (R2.4).

**The gap (R3).** The text-to-edge gap is set by insetting `pdfView` inside
`pageContainer` horizontally, not by PDFKit page margins. An inset is in screen
points, so it stays the same at any zoom without the margin ÷ scale solving
`fitWithFixedGap` does. The insets are `textGap` (20pt iPhone, 40pt iPad) less
the 4pt padding (scaled) already in the box. With the page filling `pdfView`'s
width at fit, the text lands at `textGap` from the card's edge (R3.1).
- Page mode fits the page to the inset view. Where the page's height limits it
  (iPad portrait, landscape everywhere), PDFKit centres the page and the side
  gap grows (R3.2, R3.3).
- Vertical gaps between pages in Scroll mode stay as today. On iPad,
  `fitWithFixedGap` keeps solving its vertical page margin, but against the
  inset width.
- Pinch zoom and the fit on rotation are untouched, apart from fitting the
  inset view (R3.4).
- Untrimmed books (R1.3) keep today's layout exactly.

**The sheet (R4).** When trimmed:
- `pageContainer` and `pdfView` backgrounds are the theme's paper colour, iPad
  included (instead of navy).
- `pageShadowsEnabled` is off.
- Page breaks stay on, in the paper colour, so they read as line spacing rather
  than edges.

The card's rounded corners and navy chrome are unchanged.

**Marks (R5).** Anchors are page-space rects, and saved positions are crop-box
fractions (`normalizedBounds`, `fallbackRects`). Neither changes, so R5.1 and
R5.2 hold without code changes. The gutter dot's `pageInView` uses the shown box
(`pdfView.displayBox`) instead of `.cropBox`, so a dot sits just past the
trimmed text edge, inside the gap (R5.3). With a 20pt gap and a 12pt dot
(22pt with an unread count) there's room on iPhone for the small dot. The
count dot overlaps the gap edge by a few points; see open question 1 in
requirements.md.

## Files
| File | Change |
|------|--------|
| `ios/PageTrim.swift` | new: `PageTrim.find(in:isCancelled:)` → fractions or "don't trim"; `apply(_:to:)` sets art boxes; `remembered(for:)` / `remember(_:for:)` over `UserDefaults` |
| `ios/RNPdfViewer.swift` | modified: apply a remembered trim before `showDocument`; start, cancel and apply the background find; `displayBox` `.artBox` when trimmed; `textGap` horizontal inset of `pdfView` in `layoutSubviews`; paper backgrounds and no shadows when trimmed; gutter dot uses the shown box |
| `ios/ReadPanda.xcodeproj/project.pbxproj` | modified: adds `PageTrim.swift` |
| `ios/ThemedPdfPage.swift`, `ios/PageImageScanner.swift` | unchanged; `draw(with:to:)` already themes whichever box it's given |

## Data and state
- New `UserDefaults` keys `reader_fit_v1_<sha256>`, one per book file, a few
  bytes each. Not per account: the trim depends only on the file.
- No API, store or JS changes.

## Navigation
None.

## Edge cases
- **All-scan or all-picture books** measure nothing, so they aren't trimmed (R1.3).
- **A full-bleed cover** is skipped by the finder and shown trimmed, losing its
  outer edges (R1.4 allows this).
- **One wide table or picture** widens the box for the whole book: less trim,
  nothing cut off.
- **Mixed page sizes**: fractions keep each page's trim in proportion.
- **Re-downloaded or re-exported file**: a new hash, so the box is found again.
- **Reader closed mid-find**: cancelled. Nothing stored, nothing applied (R2.3).
- **Search hits and selection** are drawn by PDFView in page space, so they're
  unaffected.
- **Offline**: no network involved.
- **Page theme**: `ThemedPdfPage.draw(with: .artBox, …)` fills `bounds(for:
  .artBox)`. The edge cover sits in the 4pt padding.

## Alternatives considered
- **Changing the crop box**: breaks every saved comment and highlight position
  (fractions of the crop box) and the positions other devices save.
- **A trim per page**: PDFKit's single zoom fits the widest page, so one wider
  page shrinks every page (simulator check).
- **Finding the box before showing the book**: a slower first open. The user
  chose background and remember.
- **PDFKit page margins for the gap**: margins are in page points and need
  re-solving at every scale; a view inset is in screen points.
