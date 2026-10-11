# iPad Support: Requirements

Status: Approved (2026-10-11)
Design handoff: `docs/handoff/ipad-support/IPAD_AND_HOME_14_16.md` (turns 14–15). Home (turn 16) has its own spec: `specs/home-redesign/`.

## Goal
ReadPanda currently ships iPhone-only (`TARGETED_DEVICE_FAMILY = 1`), so on an
iPad it runs as a scaled-up iPhone window. This gives every phone screen a
native iPad layout (handoff turns 14–15) for an 11" iPad in both orientations,
and falls back to the phone layout in narrow multitasking windows.

## Out of scope
- **Home**: covered by `specs/home-redesign/` (16a–16d supersede 14b and 1a). This spec only supplies the layout foundation Home builds on.
- **Apple Pencil ink (14h)**: approved in the handoff, but it needs a PencilKit native module and a stroke store. It gets its own spec (`specs/pencil-ink/`) once this one ships.
- Android tablets (the width-based layout should carry over with no extra work, but they aren't tested here)
- Keyboard shortcuts, drag and drop, hover states (each needs its own design proposal, per the handoff)

## Requirements

### R1. Native iPad target
**User story:** As an iPad reader, I want ReadPanda to fill my screen natively.

**Acceptance criteria**
1. THE app and widget targets SHALL build for iPhone and iPad (`TARGETED_DEVICE_FAMILY = "1,2"`) in Debug and Release.
2. THE iPad deployment target SHALL be the same as the iPhone one (app 15.1, widget 17.0).
3. WHEN running on iPad THE app SHALL support all four orientations. WHEN running on iPhone THE app SHALL stay portrait-only and look unchanged.
4. THE app SHALL support Split View, Slide Over and Stage Manager (no `UIRequiresFullScreen`).

### R2. Layout foundation
**User story:** As a developer, I want one shared way to pick a layout so every screen adapts the same way.

**Acceptance criteria**
1. THE app SHALL derive the layout from window width only, never from `Platform.isPad` or orientation: `compact` < 700pt (the phone layout), `regular` 700–999pt (the handoff's "portrait" layout), `wide` ≥ 1000pt (the handoff's "landscape" layout). A 13" iPad in portrait (1032pt) therefore gets `wide` on purpose.
2. WHEN the window resizes (rotation, Split View, Stage Manager) THE layout SHALL update without a reload, and the scroll position SHALL be kept.
3. WHEN the layout is `compact` THE screen SHALL render exactly as it does on iPhone.
4. THE page side padding SHALL be 36pt on `regular` and 40–44pt on `wide`. No line of text SHALL be wider than 640pt.
5. Every iPad screen SHALL have the same actions, sections and states as its phone screen. The only iPad-only additions are the reader's Scroll/Spread switch and the extra-large widget.

### R3. Tab bar
1. WHEN the layout is `regular`/`wide` THE tab bar SHALL show the same 4 tabs (Home · Discover · My Books · Rooms), centered, with the icon and label side by side, and a gap of 56pt (`wide`) or 48pt (`regular`).
2. THE iPad tab bar SHALL use the glass surface (`surfaceContainerGlass` + blur), falling back to `surfaceContainerHigh` if blur isn't available.
3. THE active tab and each tab's stack SHALL be kept when the layout changes.

### R4. Presentation
1. WHEN on `regular`/`wide` THE Create room flow (all steps) and New bucket SHALL open as a centered 540pt form sheet over the dimmed screen.
2. WHEN on `regular`/`wide` THE sheets owned by one control (the reader's room chip / comment layer 15n, sort pickers) SHALL open as a popover anchored to that control, with the same options.
3. THE comments sheet (14j) SHALL keep the phone's medium/large detents, capped at 640pt wide and centered, with the passage still visible.

### R5. Screen layouts (`regular`/`wide`)
Each criterion means "WHEN the layout is `regular`/`wide`, THE screen SHALL…". Details are in the handoff tables.
1. **Onboarding (14a):** a centered 520pt column. The cover row updates live as genres are picked.
2. **Login (15a):** brand panel on the left with the form in a 400pt column (`wide`); stacked in a 440pt column (`regular`).
3. **Book detail (14c):** 280pt cover on the left, 620pt content column, no scrolling needed on `wide`. Action order: Start reading · Read with a room · +.
4. **Cover grid / See all (14d):** 6 columns `wide` / 5 `regular`, covers about 160pt, search beside the title.
5. **Buckets grid (14e):** 4 columns. "New bucket" is the last tile, and the header button does the same thing.
6. **Discover (15c/15o):** search beside the title. Curated buckets 4 per row (3 on `regular`); Popular 8 (5 on `regular`).
7. **My Books (15d):** 2 shelf cards side by side, buckets in a 5-column row with "New bucket" last, then the Finished link.
8. **My bucket (15e):** fan, name, Continue and + fixed on the left; the list scrolls on the right (max 640pt).
9. **Curated bucket (15f):** the hero turned sideways (text left, fan right), 6-column grid.
10. **Currently reading (15g):** a 2-column list keeping the groups, the Paused dimming and the single play button.
11. **New bucket (15h):** a 6-column picker grid with the same controls and the same 11c fly-in.
12. **Rooms (15i):** a 2-column card grid. Join-by-code and New room move into the header row. The invite card stays last.
13. **Room (14i / 15k):** 6-week schedule strip and "Where everyone is" member dots. Comments in the right column on `wide` (under the schedule on `regular`), up to your position only, plus a count of the rest. A just-created room shows the two numbered setup cards side by side.
14. **Profile (15l):** identity and stats on the left, reading life on the right. Finished covers in a row of 8, rooms in 2 columns.
15. **Settings (15m):** the same rows in two 500pt columns. Sign out / Delete account last, with confirmation.

### R6. Reader
1. THE reader (native `RNPdfViewer` / `ReaderChromeView` / scrubber) SHALL lay out correctly at every window width and orientation.
2. **Scroll (14f):** THE reader SHALL stack the PDF pages vertically, each fit to 600pt wide at 1×, centered on `background`, with 16pt gaps. Pinch zoom goes from 1× to 3×, and rotating resets to fit-600. Comment dots sit in the margin outside the page, and the bars are hidden until a center tap.
3. **Spread (14g):** THE reader SHALL show facing pages side by side, fit to the height, with page 1 alone on the right so even pages are always on the left. Swiping or tapping the edges turns the page, and the book's real page numbers are used.
4. THE top bar SHALL hold the room chip and the Scroll/Spread switch on one row. THE reader SHALL have no Aa control on any device.
5. THE mode default SHALL follow the real orientation (width > height), not the layout. EACH orientation SHALL remember its own choice. Defaults: portrait = Scroll, landscape = Spread.
6. WHEN the mode changes or the window rotates/resizes THE reader SHALL keep the same anchor (page + rect in page coordinates).
7. WHEN the layout is `compact` THE reader SHALL behave exactly as it does on the phone (no switch).

### R7. Widgets and deep links
1. THE widget extension SHALL offer an iPad-only `.systemExtraLarge` widget (14k): 13d on the left, 13c shelf rows plus the bucket on the right, the same fallbacks as 13a–13f, and up to 4 `Link` targets of at least 44pt.
2. Existing widget sizes SHALL render correctly on iPad.
3. WHEN a widget or invite deep link opens the app on iPad THE target screen SHALL open just as it does on iPhone.

## Open questions
- [x] Tabs: a centered bottom bar, not a side rail.
- [x] Reader landscape: Spread by default, with Scroll available.
- [x] Comments: a sheet capped at 640pt. The Room screen is the exception, with comments in its right column.
- [x] Coverage: every screen. Below 700pt the phone layout is used.
- [x] Minimum OS: the same as iPhone.
- [x] 13" portrait gets `wide` on purpose; the reader's default still follows the real orientation.
- [x] PDF reader: no reflow. Scroll is fit-600 pages; Spread is a two-page book layout.
- [x] Visuals: `ReadPanda Design Review.dc.html` now has `14a`–`16e`. Those sections are the high-fidelity spec, and the markdown handoff is the behaviour spec.
