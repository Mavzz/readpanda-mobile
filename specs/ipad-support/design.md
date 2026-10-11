# iPad Support: Design

Implements `docs/handoff/ipad-support/IPAD_AND_HOME_14_16.md` §1, §3, §4, §6 and §7.

## Approach
Base the layout on **window width, not device type**. Slide Over and narrow
Split View get the phone layout for free, and Android tablets should work later
without extra code.

### Foundation
- **Native target.** `TARGETED_DEVICE_FAMILY = "1,2"` for the ReadPanda and ReadPandaWidget targets (Debug and Release, 4 entries in `project.pbxproj`). Deployment targets stay the same. `Info.plist` already lists the iPad orientations and has no `UIRequiresFullScreen`.
- **`DS.layout`** in `src/styles/global.js`:
  ```js
  layout: {
    regularMin: 700, wideMin: 1000,
    pagePad: { compact: 24, regular: 36, wide: 44 },
    textMax: 640, sheetMax: 640, formSheet: 540,
    coverMin: 150, // grid columns grow until covers would drop below this
  }
  ```
  Also add `DS.type.pageTitleLarge` (30/800, letter-spacing -0.6) for iPad page titles.
- **`useLayout()`** in `src/hooks/useLayout.js` wraps `useWindowDimensions()` and returns `{ width, height, sizeClass, isLarge, isLandscape, pagePad, columns(compact, regular, wide) }`. `columns` takes the handoff's fixed counts, because the design names exact numbers (5/6, 3/4, …) rather than a minimum width.
- **`<ReadableColumn>`** in `src/components/ReadableColumn.js` centers its children with `maxWidth: DS.layout.textMax`.
- **`<SplitLayout left right ratio>`** in `src/components/SplitLayout.js` gives the 7fr/5fr or 3fr/2fr two-column layout on `wide` and stacks the columns on `regular`/`compact`. Home, Room, Profile, Login, My bucket, Book detail and Curated bucket all reuse it.

### Screens
Each screen keeps its phone render path for `compact`. Large layouts branch
inside the same component, or a `*Large` subcomponent when the tree is very
different. That keeps all actions and state in one place and enforces R2.5
(parity). A screen with a `use*Data` hook shares it between both layouts.

| ID | File(s) | How |
|---|---|---|
| 14a | `InterestScreen.js` | `ReadableColumn` at 520 |
| 15a | `LoginScreen.js`, `SignUpScreen.js` | `SplitLayout` brand / 400pt form |
| 14c | `BookDetailScreen.js` | `SplitLayout` 280 / 620 |
| 14d | `BookGridScreen.js` | `columns(3,5,6)`, `key` on the FlatList tied to the column count, search in the header row |
| 14e | `BucketGridScreen.js` | `columns(2,3,4)`, trailing "New bucket" tile |
| 15c/o | `DiscoverScreen.js` | buckets `columns(2,3,4)`, Popular `columns(3,5,8)` |
| 15d | `MyBooksScreen.js` | shelf cards in a row, buckets as a 5-column grid |
| 15e | `MyBucketScreen.js` | `SplitLayout` with a fixed left side and a scrolling right side |
| 15f | `CuratedBucketScreen.js` | sideways hero, `columns(3,5,6)` |
| 15g | `ReadingScreen.js` | 2-column list |
| 15h | `CreateBucketScreen.js` | `columns(3,5,6)` |
| 15i | `RoomsScreen.js` | 2-column grid, actions in the header |
| 14i/15k | `roomLobby/*` | `SplitLayout`: schedule + members left, comments right (`wide`); stacked (`regular`) |
| 15l | `profile/ProfileScreen.js` | `SplitLayout` |
| 15m | `profile/SettingsScreen.js` | rows split into two 500pt columns |

### Navigation and presentation
- `TabNavigator.js` gives the tab bar `tabBarPosition: 'bottom'` with `tabBarLabelPosition: 'beside-icon'` on large layouts, centered items via `tabBarItemStyle` width and the 56/48 gap. The height comes from `useSafeAreaInsets()` instead of the hard-coded 85/25. For blur, adding `@react-native-community/blur` needs approval as a new dependency. Until then, use the `surfaceContainerHigh` fallback that's already documented.
- `MainStackNavigator.js`: the `createFlow` options become a function of `sizeClass`, using `presentation: 'formSheet'` with `sheetAllowedDetents: 'fitToContents'` (native-stack 7) on large layouts. The formSheet width is set by UIKit on iPad (about 540pt), which matches the handoff.
- **Popovers.** React Native has no built-in popover. Add a small `<Popover anchorRef>` component in `src/components/Popover.js` that measures the anchor with `measureInWindow` and renders a positioned card in a `Modal`. `PickerSheet` renders through it on large layouts. The native reader's room chip uses `UIPopoverPresentationController` in Swift.

### Reader (native)
- `RNPdfViewer.swift`: replace the `UIScreen.main.bounds` initial frames (lines 131–132) with `.zero`, since `layoutSubviews` already sets them.
- **Scroll (14f).** `displayMode = .singlePageContinuous`, vertical. Each page is fit to 600pt: `scaleFactor = 600 / pageWidth`, with `minScaleFactor` set to that and `maxScaleFactor` at 3×. Center it on `background` with 16pt page gaps (`pageBreakMargins`). Rotation resets the scale to fit-600. Comment dots move into the margin outside the page bounds.
- **Spread (14g).** `displayMode = .twoUp`, `displaysAsBook = true` (page 1 alone on the right), `usePageViewController(true)` for swiping, `autoScales = true` to fit the height. Edge taps turn the page.
- **Anchor.** Both modes render the same PDF pages, so the anchor is `{page, rect}` in page coordinates. Before a mode or size change, read it from `pdfView.currentDestination` / the visible rect, and restore it with `go(to: rect, on: page)` afterwards. Trigger when `bounds.size` changes in `layoutSubviews`.
- **Mode setting.** `readerSettings` already has `pageMode` (`scroll` | `page`) for the phone. On large layouts, add `reader_mode_portrait` / `reader_mode_landscape` (`scroll` | `spread`, defaulting to scroll / spread). The key is chosen by the real orientation (`width > height`), not by `sizeClass`. On `compact`, `pageMode` keeps working as it does today. Both are passed to the native view as props, along with `sizeClass`.
- `ReaderChromeView.swift`: a top-bar row with the room chip and a `UISegmentedControl` (Scroll | Spread), shown only on large layouts. There's no Aa control in the current code, so "remove Aa" is just a rule not to add one.
- `CommentSheetView.swift`: cap the width at 640 and center it on large widths, keeping the existing detents.

### Widgets
- `ios/ReadPandaWidget/`: a new `ExtraLargeWidget` with `.supportedFamilies([.systemExtraLarge])` that composes the existing 13d large view and the 13c shelf rows. It reads the same `widgetState` payload, so nothing changes on the RN side. Add it to the widget bundle.

## Data and state
No store or API changes. The only new persisted value is the reader mode per orientation in `readerSettings`.

## Edge cases
- Rotating with a form sheet, popover or comments sheet open: popovers re-measure their anchor or close.
- A `FlatList` whose `numColumns` changes needs a new `key`, so scroll position is restored manually (via the index of the first visible item).
- Stage Manager resizing freely: no hard-coded column counts.
- Split View ⅓ → `compact` → the phone layout, including the bottom sheets.
- A 13" iPad in portrait (1032pt) gets `wide` by design, but the reader opens in Scroll because the mode follows the real orientation.
- Spread: page 1 alone on the right (`displaysAsBook`), and an odd page count leaves the last page alone on the left.

## Alternatives considered
- **`Platform.isPad`.** Rejected: it's wrong in multitasking, and the handoff forbids it.
- **Separate `*Screen.ipad.js` files.** Rejected: two copies of every screen's logic would break the parity rule.
- **Side-rail navigation.** Rejected by the design decision (R3).
