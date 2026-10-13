# iPad Support: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes. Every screen task includes checking
`compact` (iPhone) for regressions. Tasks 1–4 unblock `specs/home-redesign/`.

### Foundation
- [x] 1. Turn on the native iPad target for the app and widget (R1.1–R1.4)
- [x] 2. Add `DS.layout`, `DS.type.pageTitleLarge` and the `useLayout()` hook (R2.1, R2.2, R2.4)
- [x] 3. Add the `ReadableColumn` and `SplitLayout` components (R2.4)
- [x] 4. Tab bar: centered with icons beside labels on large layouts, height from safe-area insets (R3.1–R3.3)

### Presentation
- [x] 5. Form sheets for Create room (all steps) and Paywall on large layouts; New bucket stays full screen (R4.1)
- [x] 6. `Popover` component, with PickerSheet/sort rendering through it on large layouts (R4.2)

### Screens
- [x] 7. Onboarding (14a) and Login/SignUp (15a) layouts (R5.1, R5.2)
- [x] 7b. ~~14a onboarding content~~ moved to `specs/interests-redesign/` (phone + iPad)
- [x] 8. Book detail (14c) (R5.3)
- [x] 9. Cover grid (14d), buckets grid (14e) and New bucket picker (15h) (R5.4, R5.5, R5.11)
- [x] 10. Discover (15c/15o) (R5.6)
- [x] 11. My Books (15d) and Currently reading (15g) (R5.7, R5.10)
- [x] 12. My bucket (15e) and Curated bucket (15f) (R5.8, R5.9)
- [x] 13. Rooms (15i) (R5.12)
- [x] 14. Room (15k layout): the 2a sections in two columns (R5.13, partial)
- [x] 14b. ~~Room 14i content~~ moved to `specs/room-active/` (2c phone + 14i iPad)
- [x] 15. Profile (15l) and Settings (15m) (R5.14, R5.15)

### Reader (native)
- [x] 16. Bounds-only layout, keep the anchor on resize/rotate, cap the comments sheet at 640 (R6.1, R6.5, R4.3)
- [x] 17. iPad Scroll: fit to window, 12pt gaps, 1×–3× zoom, Page turning honoured (R6.2–R6.4, R6.6). *Spread, the switch and the per-orientation settings were built and then removed after device testing.*
- [x] 18. The room chip / comment layer as a native popover (15n) (R4.2)

### Widgets and QA
- [x] 19. `.systemExtraLarge` widget (14k), and check the existing sizes on iPad (R7.1, R7.2)
- [x] 20. Deep links on iPad: widget taps and invites (R7.3)
- [ ] 21. Run the handoff §7 QA checklist on iPad mini, Air 11" and Pro 13" × portrait/landscape × full/Split ½/⅓, plus a full iPhone regression pass (all)

## Notes
- Task 1: nothing else needed. `Info.plist` already had the iPad orientations and a launch storyboard, no `UIRequiresFullScreen`, and no native orientation locks. Fixed 10 lint warnings from before this work so `lint:check` passes (added `DS.colors.scrim` / `imageScrim`).
- Task 2: dropped `DS.layout.coverMin` from the design. `columns()` takes the handoff's fixed counts, so nothing reads it. Also exported `sizeClassFor(width)` for code outside React.
- Task 4: only the iPad bar's height comes from safe-area insets. The phone keeps its fixed 85/25 so iPhone stays unchanged (R2.3). Items are centred with auto margins instead of a custom `tabBar`. Glass still uses the `surfaceContainerHigh` fallback, since no blur library is installed. Not yet checked visually: it needs a signed-in session.
- Task 5: New bucket stays full screen (spec R4.1 updated; 15h draws it full width). Create room's steps 2–3 happen on the Room screen after `replace('RoomLobbyScreen')`, as on the phone and as 15k draws it, not inside the sheet as 15j's text says. Keeping parity with the phone. The size is UIKit's default form sheet (540×620), with no custom sizing.
- Task 6: `PickerSheet` takes an optional `anchorRef`. With it, it's a popover on iPad (See all's sort pill so far); without it, it's a bottom sheet capped at 640pt and centred (Room prompts, Add to bucket). The reader's room chip is native and is task 18.
- Task 7: Login on `wide` = brand panel + 400pt form (15a). On `regular` it's the phone layout in a 440pt column. Sign up has no iPad drawing, so it uses the same 440pt column on every iPad layout. Onboarding has today's content centred at 520pt; 14a's new content is split out as 7b.
- Task 8: same content as the phone, in 14c's layout. Left out because the phone doesn't have them (parity): 14c's "Rooms you're in reading this" section, the "Also in {bucket}" row and the share/⋯ buttons. On iPad, + in the action row replaces the phone's nav bookmark button, and the room and bucket pickers open as popovers. The portrait layout (no drawing) uses a 200pt cover, a 240pt column and 36pt padding.
- Task 9: grids use `columns()` and are keyed by column count; on iPad, `SeeAllHeader` uses the 30pt title and page padding. Left out for parity: 14d's search field (the phone cover grid has none) and 14e's separate "Saved from Discover" section (the phone mixes saved copies in, marked with a sparkle). Added `large` to `BucketTile` (bigger fan, 196pt curated tiles) and `width` to `NewBucketTile`.
- Task 10: on iPad Popular is a grid (no sideways scroll), showing 1 row of 8 in landscape and 2 rows of 5 in portrait, as drawn; See all appears when there's more. The handoff doesn't give a row count beyond the drawings.
- Task 11: added a `style` prop to `ShelfRow`. On iPad, Currently reading pairs each group's books into rows (SectionList has no numColumns). My Books shows `cols − 1` buckets plus the New tile, with See all past that.
- Task 12: on iPad My bucket renders its unchanged list (reorder, swipe and ⋯ intact) beside a fixed 320pt column, with no header inside the list. Curated bucket's hero is drawn sideways with the same info block, and its grid is 5 or 6 columns.
- Task 14: on iPad landscape, the Room screen splits its existing sections 3:2 (book | invite, members, danger zone); the portrait layout stacks them at 640pt. 14i's extra content is split out as 14b.
- Task 15: on iPad, a new user's Profile keeps the phone's 7c content (the checklist and empty shelf) in the columns rather than 15b's first-run cards (parity). Settings columns: ReadPanda+ (not in the 15m drawing), Reading and About on the left; Rooms & privacy and the account card on the right.
- Task 16: kept the `UIScreen.main.bounds` initial frames. The code explains they avoid broken-constraint logs at `.zero`, and layout replaces them before anything is drawn, so design.md's ".zero" step was wrong. The anchor is `pdfView.currentDestination`, noted before a resize and restored a run-loop turn later. The comments sheet is capped by constraints (centred, ≤ 640, fills below that), so iPhone is unchanged.
- Task 17: `readerMode` ("scroll" | "spread") is sent only on iPad layouts, picked by real orientation from `reader_mode_portrait` / `reader_mode_landscape`; the phone still uses Settings → Page turning (which also returns if the window drops below 700pt). Spread is `.twoUp` + `displaysAsBook` without a page view controller, so swipes and the outer 12% edge taps turn pages. Not done yet: 14f's "no bars until a centre tap" and comment dots in the margin outside the page (dots stay in their current overlay). Needs a device check: build succeeds, but the modes haven't been seen running.
- Task 18: the reader's room picker (long-press the comment button) sends that button's window frame with `onRoomPickerRequested`. On iPad, `PickerSheet` opens it as a popover anchored there (`Popover` now accepts `anchorRect`); the phone ignores the frame.
- Task 19: `ExtraLargeWidget` reuses 13d's `TonightFace` (without its Up next) on the left; the right side has "Also reading" rows and `UpNextSection` (whose curated fallback comes from `upNext(after:)`). Capped at 4 `Link`s: tonight, room, bucket, then rows; extra rows show but open the library. Existing families aren't changed; checking them on an iPad home screen is part of task 21.
- Task 20: no iPad-specific code needed. Every target route is unchanged, and Rooms' `focusCode` reaches the invite field through the same ref (it sits in the header on iPad). Checking on a device is part of task 21.
- Device feedback (2026-10-13): comment dots drifted after rotating or switching modes, because the dots' scroll observer stayed bound to PDFKit's old scroll view and nothing redrew them after the position restore. Fixed: the observer rebinds on every mode change, the dots refresh after a restore, and dots for pages not on screen are hidden. Scroll now fits the window width (the 600pt cap is dropped, R6.2 updated), with a 32pt margin each side for the dots. Spread has 16pt per side.
- Device feedback 2 (2026-10-13): the spacing differed between modes and orientations. Now there's one 32pt gap (`pageGap`) between a page and the window edge, header, scrubber or next page in both iPad modes: a 16pt container inset plus a 16pt PDFKit page margin. The dot layer sits above the page container so dots can use the margin unclipped. The phone layout is unchanged.
- Device feedback 3 (2026-10-13): the margin-fixing loop was driven by `logPageGeometry` (DEBUG-only). PDFKit margins are in page units, so they're sized as half-gap ÷ scale. Spread is fitted by hand, and its pair is centred by measuring where the pages land and sliding the PDF view, because PDFKit leaves the spare width on one side. Shifting vertically fought PDFKit's layout, so it was dropped. Instead, Spread's bars now float over the pages and auto-hide (R6.4), so the pages get the full screen height.
- Device feedback 4 (2026-10-13): floating bars were reverted (now under Later in requirements.md). Bars are fixed in both modes. Portrait Spread is top-aligned: the PDF view is trimmed to the spread's height so PDFKit has nothing to centre in. Resizes are detected on the container's size, so the trim and centring shift don't count as resizes.
- Device feedback 5 (2026-10-13): Spread was dropped. Side by side, two PDF pages had text too small to read. Removed: Spread, the Scroll/Spread switch, the per-orientation settings, floating bars, the swipe and edge-tap page turns, and the DEBUG geometry log. The native prop is now `largeLayout` (bool) instead of `readerMode`.
- Device review (2026-10-14): the Paywall form sheet cropped its fine print and slid its header under the title. UIKit's `.formSheet` kept a fixed ~540×620 size while React Native laid the screen out at window height. Form sheets are now a transparent modal with the card drawn by `FormSheetFrame` (540pt wide, height min(760, window − 96), dimmed backdrop, tap outside to close). Paywall and Create room both use it. Paywall uses 12pt in place of the window's safe-area insets inside the card.
