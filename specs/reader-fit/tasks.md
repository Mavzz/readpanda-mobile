# Reader fit: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` and `yarn jest` pass.

- [x] 1. `PageTrim.find`: the book's box as fractions, or "don't trim" (R1.1, R1.3, R1.4)
  - new `ios/PageTrim.swift`, added to the Xcode target
  - text from page selections, pictures from `PageImageScanner`; skip covers,
    scans and blank pages; 4pt padding; under 5% → don't trim
  - checked on the Mac / in the simulator against test PDFs: margins, a
    full-bleed cover, a wide table, a scan-only book, mixed page sizes; timing
    on a 500-page book
- [x] 2. Remember per file (R2.2)
  - `UserDefaults` `reader_fit_v1_<hash>`; "don't trim" remembered too
- [x] 3. Apply the box: art boxes, `displayBox = .artBox`, crop box untouched (R1.2, R2.1, R2.2, R6.1)
  - remembered box applied before `showDocument`
- [x] 4. Find in the background on first open; cancel; switch keeping place (R2.1, R2.3, R2.4, R6.2)
- [x] 5. The fixed gap: `pdfView` inset in Scroll and Page mode, iPhone and iPad (R3.1, R3.2, R3.3, R3.4)
- [x] 6. One continuous sheet: paper backgrounds, no shadows when trimmed (R4.1, R4.2)
- [x] 7. Gutter dots against the shown box (R5.3)
- [x] 8. Marks and saved positions across trimmed and untrimmed (R5.1, R5.2)
  - highlight on a trimmed page; check the saved fractions match an untrimmed
    reading of the same words
- [x] 9. Device pass: iPhone and iPad, both orientations, Scroll and Page, three themes (R3.1–R3.4, R4.1, R4.2, R6.2)

- [ ] ~~10. Page mode fits the text to the width~~: tried and reverted, see Notes

## Acceptance
<!-- Checked one requirement at a time once every task is done, before the
commit. One line per criterion: "- [x] R1.1 <short> — how it was checked".
A partial or waived one stays unticked with the reason. -->
- [x] R1.1 One box per book, covers/scans/blank pages left out — Mac: generated PDFs (plain, full-bleed cover, blank pages, picture in margin, mixed sizes); device: Moby Dick trimmed on iPhone and iPad
- [x] R1.2 File and crop box untouched — code: only the art box is set (PageTrim.swift), saved positions use the crop box
- [ ] R1.3 Nothing to measure or < 5% → untrimmed — Mac only (scan-only, tiny margins, wide table → don't trim); waived on device: no scanned book checked before commit
- [ ] R1.4 Nothing cut off except full-page pictures' edges — Mac tests and device screenshots of pages 12–16 show nothing cut; waived: title page and chapter starts not checked one by one before commit
- [x] R2.1 First open: untrimmed, then switches — simulator build of the real reader (first open → 40pt gaps); seen on device
- [x] R2.2 Later opens trimmed from the first frame — simulator: reopen identical to the switched state; device reopens trimmed
- [x] R2.3 Closed mid-find: stops, nothing misapplied — code: Cancellation checked per page and before applying, document identity checked; Mac: cancel after 10 pages returns nothing
- [ ] R2.4 Reading responsive while finding — `.utility` queue on its own document copy; waived: not checked on device before commit
- [x] R3.1 Scroll: 20pt iPhone / 40pt iPad, both orientations — simulator: 20.0pt and 40.0pt; device screenshots
- [x] R3.2 Portrait Page mode: same gap, or centred if height limits — device (after the task 10 revert)
- [x] R3.3 Landscape Page mode: whole page, centred — device; width fit tried and deferred (task 10)
- [x] R3.4 Pinch zoom and fit on rotation unchanged — device; now no zooming out past the fit anywhere (user's request); simulator rotation checks land at fit
- [x] R4.1 One continuous paper sheet — device screenshots, Sepia and Night
- [x] R4.2 Works in all three themes — device: Night fills, no white on fast scroll or page turns (iPhone and iPad); simulator: 0 white frames with slowed drawing
- [x] R5.1 Marks on the same words — device screenshots: comment fills and highlights on their passages, trimmed, in Night
- [ ] R5.2 Positions saved while trimmed place correctly elsewhere — code: saved as crop-box fractions as before; waived: not cross-checked on another device before commit
- [ ] R5.3 Dots in the gap, never over text — device: dots beside the text on iPad; partial on iPhone, where the 22pt unread dot reaches a few points past the card (noted); waived
- [x] R6.1 Resumes at the saved page — device: books open at their saved page
- [x] R6.2 Switch and rotation keep the passage on screen — simulator and device rotation checks

## Notes
<!-- One line per change from design.md: "Task 3: used X instead of Y because …" -->
Task 1: the 4pt padding is left to `apply` (task 3), per page in page points, so pages of different sizes get the same padding; `find` returns the unpadded box.
Task 1: Mac check (generated PDFs): plain, full-bleed cover (skipped), blank pages (skipped), picture in the margin (box widens), mixed sizes, wide table / tiny margins / scan-only (don't trim), cancellation. 500 pages ≈ 1 s on a Mac, so a few seconds on a phone, in the background on first open only.
Task 3: the art box is also reset to the crop box for an untrimmed book, so a book shown after a trimmed one never inherits its boxes.
Task 4: a `Cancellation` flag per search instead of a cancelled `DispatchWorkItem`: the item would have to capture itself to check, a retain cycle. Before the jump to the saved page, the switch doesn't anchor; the jump lands on the trimmed layout.
Task 5: checked in a simulator PDFView with the real `PageTrim`, `ThemedPdfPage` and the reader's inset formula: text 20.0pt from the card's left edge (21.4pt on the right, where that page's longest line is a little shorter than the book's widest).
Task 6: `applySheet()` now owns the card, PDF view background and page shadows for every layout (it replaces the separate lines in `applyLayout`, `applyPageMode` and the theme setter); untrimmed it gives exactly the old colours.
Task 7: the 22pt unread dot is wider than the phone's 20pt gap, so it reaches a few points past the card instead of over the text (requirements open question 1).
Task 8: no code change needed: anchors are page-space rects and saved positions crop-box fractions, neither touched by showing the art box. Device check in task 9.
Device check 1: Night fills (`ThemedMark`) drew in page space without `page.transform(context, for: box)`, so with the art box shown they landed off the words. Fixed in ThemedPdfPage.swift (page-theme code; a crop box starting at the origin had hidden it).
Device check 1: zooming out went far past the fit (PDFKit's own floor) on the phone and in Page mode. Pinch now runs from the fit to 3× in every layout, trimmed or not (the user asked for no zooming out at all), as iPad Scroll already did.
Device check 1: a fast scroll in Sepia/Night showed white pages before the theme: PDFKit backs each page piece with a white layer until it's drawn (also untrimmed, worse trimmed because pages draw larger). `paintBlankPages()` paints those layers the paper colour as you scroll. In a simulator fling with drawing slowed to device speed, white frames went from 223 of 256 to 80, the rest being single frames as a new piece appears. Themed thumbnails, KVO on sublayers and a `drawPage(_:to:)` override didn't help.
Device check 2 (iPad Page mode, both orientations): a page sliding in showed a blurred black-on-white picture of itself for about a second. It's PDFKit's quick preview, a layer it names `backgroundLayer`, drawn without the subclass's `draw` (a themed `thumbnail(of:for:)` override didn't reach it, so it was taken out). The repaint walk now re-tints that picture with the theme (sepia multiplied, Night inverted) whenever PDFKit puts in a new one, and follows every scroll view in the PDF view, including the page view controller's. Reproduced in a simulator build of the real reader with drawing slowed to iPad speed: white frames on page turns went from 39 of 272 to 0 in Sepia and Night.
Task 10 (reverted): Page mode fitted to the width (`fitPageWidth()`, then each page's scroll view set to its top). In the simulator it worked with `goToNextPage`, but on the iPad, swiping left pages small and others over-zoomed, and even the open was right only some of the time: PDFKit's page view controller resets each page's zoom on its own schedule. Removed; Page mode fits the whole page again, as first specced. Width-fit Page mode moves to a later spec on a plain one-page view with our own swipe.
Device check 3: rotating iPad Page mode portrait → landscape stayed zoomed in. The zoom floor was lowered after the new fit was set, so a smaller fit was held at the old floor. The floor now goes first, and in Scroll mode a resize goes back to the fit. Simulator build of the real reader: iPad Page 2.052 → 1.359 at fit; iPhone Scroll and Page land at the fit after rotating.
