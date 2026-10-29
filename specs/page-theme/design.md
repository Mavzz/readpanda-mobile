# Page theme: Design

## Approach
The setting already exists (`pageTheme` in `src/utils/readerSettings.js`,
stored as `reader_page_theme`). It gets passed down the same way `pageMode` is:
`ManuscriptScreen` reads it once when the book opens, `PdfViewer` passes it on,
and `RNPdfViewer` takes it as a view prop. Settings and the reader sit in the
same main stack, and the reader can't open Settings, so reading the value at
mount is enough (R1.2).

PDFKit can't restyle a PDF's text, so the theme is applied while each page is
drawn. Every page of the document is a `ThemedPdfPage` (the document is a
`ThemedPdfDocument` that names it as its `pageClass`). Its `draw(with:to:)`:

1. Draws the PDF as authored.
2. Paper: stops here (R2.1).
3. Sepia: clips to the page minus its image areas (even-odd), and fills it
   with `readerSepia` in `.multiply`. White becomes sepia, black stays black
   (R3.1, R5.1).
   Night: the same clip, filled with white in `.difference`, which inverts it.
   White becomes black and black text becomes white (R4.1, R5.1). For a scanned
   page (R4.3) the clip is the whole page.

The comment and highlight marks stay PDFKit's in every theme. PDFView draws
them on a layer above the page, which the theme never touches (R6.1), and it
redraws them the moment one is added or removed. Marks drawn into the page
itself only showed up once the page was redrawn, which happened when the reader
moved away and back, because PDFView caches each page's drawing. Each fill's
colour comes from `PageTheme.fillColor(_:)`:
- Sepia: PDFKit's own highlight, which multiplies into the page, but more opaque
  (each fill's opacity ÷ 0.55, up to 1). At Paper's opacity, yellow on cream
  barely shows. Black text stays black.
- Night: a `ThemedMark`, a `PDFAnnotation` subclass that draws itself as a plain
  rounded fill at 80% of the mark's opacity. A highlight multiplies, and on black
  that only tints the text. A mark draws on its own transparent layer, so a blend
  mode can't reach the page: the fill lies over the white text. White text on
  the fill is about 5.7:1 at the most opaque (the unread comment) (R6.2). It's
  a `.square` annotation, because PDFKit never asks a `.highlight` to draw
  itself.
Comments have no underline in any theme; the gutter dot is their cue that
isn't colour.

Image areas come from `PageImageScanner`, which walks the page's content stream
with `CGPDFScanner`. It keeps track of the transform through `q`, `Q` and `cm`,
and on `Do` checks whether the XObject is an image. If so, it records the
bounding box of the unit square under the current transform. Form XObjects are
followed recursively, with their `/Matrix`. Results are cached on the page, so
each page is scanned once per open (R7.2). Anything the scanner can't read
(inline images, a broken stream) is left out of the list, so the image is
themed with the page (R5.2).

The space around the page follows the theme: `pdfView.backgroundColor` is the
theme's paper colour wherever it's `.white` today (the phone layouts), so
neither the paged card nor the loading frame flashes white (R3.2, R4.2, R4.4).
The iPad large-scroll layout keeps the navy background between pages. The
chrome views aren't touched (R8.1).

## Files
| File | Change |
|------|--------|
| `src/styles/global.js` | modified: `readerPaper` (`#ffffff`), `readerSepia` (`#f4ecd8`), `readerNight` (`#000000`) under `DS.colors`, with a comment that they're page colours, not app surfaces |
| `ios/ReaderTheme.swift` | modified: the same three in `DS.Colors`, same order; a `PageTheme` enum (`paper`, `sepia`, `night`) with `init(_ raw: String?)` that falls back to `.paper` (R1.3), plus `paperColor` |
| `docs/handoff/README.md` | modified: the three hexes added to the hex → token map |
| `ios/ThemedPdfPage.swift` | new: `ThemedPdfDocument`, `ThemedPdfPage` (the drawing above) and `ThemedMark` |
| `ios/PageImageScanner.swift` | new: `PageImageScanner`, CoreGraphics only |
| `ios/ReadPanda.xcodeproj/project.pbxproj` | modified: adds both new files to the app target |
| `ios/RNPdfViewer.m` | modified: `RCT_EXPORT_VIEW_PROPERTY(pageTheme, NSString)` |
| `ios/RNPdfViewer.swift` | modified: `@objc var pageTheme`; `ThemedPdfDocument` on all three load paths; `.white` backgrounds follow the theme; `ThemedMark` passage fills in Sepia and Night |
| `src/components/PdfViewer.js` | modified: `pageTheme` prop, default `'paper'` |
| `src/screens/ManuscriptScreen.js` | modified: `useState(() => getReaderSetting('pageTheme'))`, passed to `PdfViewer` |

## Data and state
No new keys: `reader_page_theme` already exists. No API or store changes.

## Navigation
None.

## Edge cases
- **Theme set before the document loads**: the prop usually arrives first. The
  page class is chosen when the document is assigned, and each page reads the
  theme from its document when it draws, so the order doesn't matter.
- **Marks that arrive after the page is showing** (comments load after the
  book): PDFKit draws them on its own layer and shows them at once, in every
  theme.
- **Scanned PDFs**: one image covering ≥ 70% of the page counts as a scan and
  is inverted in Night (R4.3). In Sepia it's left untinted, since a scan is
  already paper-coloured.
- **Pages with no images**: the scanner returns nothing, and the whole page is
  tinted or inverted.
- **Rotated or skewed images**: their bounding box is kept as is, so a little
  of the page round the corners stays un-themed. That's acceptable.
- **iOS Smart Invert**: the PDF view is marked `accessibilityIgnoresInvertColors`
  in Night, so the two inversions don't cancel each other out.
- **Search hits and text selection** are drawn by `PDFView` over the page, not
  by the page, so the theme doesn't touch them (R6.3).
- **Offline / not downloaded**: no change. The status view covers the page as
  it does today.

## Alternatives considered
- **An overlay view with a blend `compositingFilter` over `PDFView`**: much
  less code, but it themes everything below it, so images, the comment blue
  and the highlight yellow would all be inverted. It fails R5 and R6.
- **Rendering each page to an image and filtering it with Core Image**: costs
  memory and is slow at zoom; PDFKit's tiled drawing is lost.
- **Night as the app's navy with soft text**: considered, but the user chose
  true black.
