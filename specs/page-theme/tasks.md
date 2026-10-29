# Page theme: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes.

- [x] 1. Page colour tokens and the `PageTheme` enum (R1.3, R3.1, R4.1)
  - `readerPaper`, `readerSepia`, `readerNight` in `src/styles/global.js` and
    `ios/ReaderTheme.swift`, same order; hex map in `docs/handoff/README.md`
  - `PageTheme` with the fallback to `.paper` and `paperColor`
- [x] 2. Pass the setting down (R1.1, R1.2, R1.3)
  - `ManuscriptScreen` reads `pageTheme` once; `PdfViewer` passes it;
    `RNPdfViewer.m` exports it; `@objc var pageTheme` in `RNPdfViewer.swift`
- [x] 3. `ThemedPdfPage` for Paper and Sepia, with no image handling yet (R2.1, R3.1, R1.4)
  - new `ios/ThemedPdfPage.swift`, added to the Xcode target
  - document delegate + `classForPage()` on all three load paths
  - annotations drawn after the theme
- [x] 4. Night inversion (R4.1, R4.3)
  - `.difference` fill; Smart Invert opt-out
- [x] 5. Backgrounds follow the theme, no white flash (R3.2, R4.2, R4.4, R8.1)
  - every `.white` `pdfView.backgroundColor` in `applyLayout` / `setupPdfView`
  - check loading, reload, page turn, rotation, iPad
- [x] 6. `PageImageScanner`: find image areas and keep them un-themed (R5.1, R5.2, R4.3, R7.2)
  - `q`/`Q`/`cm`/`Do`, Form XObjects followed, cached per page
  - ≥ 70% of the page counts as a scan
- [x] 7. Night marks (R6.1, R6.2, R6.3)
  - passage fills at 45% alpha instead of multiply annotations
  - measure contrast on device for both fills
- [x] 8. Performance pass (R7.1)
  - scroll and page through a long, image-heavy manuscript in each theme on the
    oldest supported iPhone; profile `draw(with:to:)` if anything hitches

## Acceptance
<!-- Checked one requirement at a time once every task is done, before the
commit. One line per criterion: "- [x] R1.1 <short> — how it was checked".
A partial or waived one stays unticked with the reason. -->
- [x] R1.1 Theme saved from Settings — device: Settings row shows the picked theme; code: SettingsScreen.js:65,147
- [x] R1.2 Theme passed to the reader on open — device: books open in Sepia and Night on iPhone and iPad; code: ManuscriptScreen.js:79 → PdfViewer.js:136 → RNPdfViewer.swift:549
- [x] R1.3 Missing or unknown value → Paper — code only (can't be set from the app): PdfViewer.js:136, ReaderTheme.swift:128-132
- [x] R1.4 First frame already themed — device: no white frame on open; code: theme set before the document shows, RNPdfViewer.swift:1330
- [x] R2.1 Paper unchanged from today — device: white page, blue comment fill, yellow highlights, Scroll and Page; code: ThemedPdfPage.swift:47. One intended change: no comment underline (R6.1)
- [x] R3.1 Sepia page, dark text — device: cream page, dark text, Scroll and Page (iPhone and iPad); code: ThemedPdfPage.swift:74
- [x] R3.2 Sepia around the page — device: no white band in Page mode or between pages in Scroll; code: RNPdfViewer.swift:271,555,608 and the edge cover, ThemedPdfPage.swift:91
- [x] R4.1 Night inverted page — device: black page, white text, Scroll and Page; code: ThemedPdfPage.swift:80
- [x] R4.2 Black around the page — device: no white round the page or between pages; simulator: edge hairline measured gone; code: RNPdfViewer.swift:271,555,608, ThemedPdfPage.swift:91
- [x] R4.3 Scanned pages inverted whole — device: confirmed by user; simulator: a full-page-image page inverted to light on black; code: ThemedPdfPage.swift:26,55-64
- [x] R4.4 No white flash in Night — device: loading, fast page turns, rotation, back from background
- [x] R5.1 Images keep their colours — device: pictures unchanged in Sepia and Night (user); Mac: scanner placed plain, form-wrapped and overlapping images right; code: ThemedPdfPage.swift:64-67, PageImageScanner.swift:100
- [x] R5.2 Unreadable image falls back to themed — code only (needs a malformed PDF): unplaceable images are left out of the list, PageImageScanner.swift:21
- [x] R6.1 Marks keep their hues — device: blue comments and yellow highlights in all three themes, no underline (by request); code: PDFKit draws marks above the page, fills from ThemedPdfPage.swift:103
- [x] R6.2 Night fills ≥ 4.5:1 — calculated ~5.7:1 at the strongest fill (unread comment, 80% of 0.55); device: highlighted text readable in Night (user)
- [x] R6.3 Dots, selection and menu unchanged — device (iPad and iPhone): tap a comment → sheet only; tap a highlight → our menu only; long-press → selection menu only, tap away clears it; dots open threads
- [x] R7.1 No visible hitch — device: Scroll and Page in all three themes as smooth as Paper on iPhone 13 and an older-generation iPad
- [x] R7.2 Scanned once per page per open — code: cached behind a lock, ThemedPdfPage.swift:33-34; Mac: 300 pages in 4 ms
- [x] R8.1 Chrome unchanged — device: header, bottom bar, comment sheet, offline pill and the not-downloaded status screen look as in Paper, in Sepia and Night

## Notes
<!-- One line per change from design.md: "Task 3: used X instead of Y because …" -->
Task 3: pages come from a `ThemedPdfDocument` subclass overriding `pageClass`, not a `classForPage()` delegate: PDFKit's header offers both, and the subclass can't miss pages made before a delegate is set. The document also carries the theme the pages read.
Task 6: `PageImageScanner` is its own file (`ios/PageImageScanner.swift`), CoreGraphics only, so it could be run against test PDFs on a Mac: plain, form-wrapped (2× matrix), overlapping and inherited-resource images all placed right; 300 pages scanned in 4 ms.
Task 6: `PDFPage.thumbnail(of:for:)` doesn't call a subclass's `draw(with:to:)`, so thumbnails stay unthemed. The reader doesn't use them.
Task 7 (reopened after device check): marks drawn into the page only appeared after moving pages, since PDFView caches page drawings; and at Paper's opacity, highlights barely showed on sepia. Marks are PDFKit's again: Sepia uses its highlight at a stronger opacity, Night a self-drawn `ThemedMark` at 80% opacity (blend modes can't reach the page from a mark's layer). Reproduced and checked in a simulator PDFView with marks added after the page showed. design.md updated.
Task 7 (second device check): marks flickered because every scroll, zoom and layout took all the annotations off and put them back, and PDFKit redraws them a moment later. `RNPdfViewer` now works out the marks it wants and only touches the annotations when those differ (threads, highlights, theme or document changed). Gutter dots and tap targets still rebuild each pass; they're plain views and don't flicker.
Task 5 (third device check): a white hairline showed round every page in Night: PDFView's white page reaches a pixel past the box a page may draw in. `ThemedPdfPage` now strokes the page outline in the paper colour, 4px across, outside the clip. Measured in the simulator: the 1px lines (brightness ~0.45) at the page edges and between pages are gone.
Task 7 (fourth device check): comments no longer have an underline, in any theme; the blue fill is the mark and the gutter dot the cue that isn't colour. requirements.md R6.1 and design.md updated.
Acceptance R6.3 (device check): three tap bugs, all older than page theme, fixed in RNPdfViewer.swift: (1) PDFKit's own Highlight / Remove / Add Note menu came up over the thread sheet and our highlight menu. Now PDFKit's taps wait for ours on a marked passage, and `CommentablePDFView.buildMenu` offers nothing with no selection (that also dropped Copy / Select All). (2) A long press on a commented passage also opened its thread. Now a touch held 0.35s or more isn't a tap. (3) Our tap now fails at once off a mark, so tapping away clears a selection.
Outside the spec, same branch: the iPad comment dot sits inside the card's edge (16pt in; the phone stays at 6pt) instead of in the outer margin, where a landscape page put it half off the card. Committed separately.
Task 8: checked on iPhone 13 and an older iPad (no hitch in any theme); scanning costs ~0.013 ms a page, once per page.
