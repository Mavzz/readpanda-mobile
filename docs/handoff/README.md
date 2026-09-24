# Handoff: ReadPanda Redesign (1a–1d) + Design-System Compliance

## Overview
Redesign of the ReadPanda ("Nocturnal Sanctuary") React Native app: a new 3-tab
IA (Home · Reading · Rooms), four redesigned screens, and design-system
compliance fixes. Target repo: **Mavzz/readpanda-mobile @ master**
(React Native, React Navigation, zustand stores, react-native-vector-icons).

## About the Design Files
The HTML files in this bundle are **design references created in HTML** —
prototypes showing intended look and behavior, NOT production code to copy.
Your task is to **recreate these designs in the existing React Native codebase**
using its established patterns: `DS` tokens from `src/styles/global.js`,
existing components (`CommonHeader`, `Button`, `Card`, `ProfilePicture`,
`Badge`), React Navigation, and zustand stores.

`ReadPanda Design Review.dc.html` — sections with id `1a`–`1d` contain the
four redesigns, each inside an iPhone frame (402×874 logical px). All styles
are inline; read them as the spec. `ios-frame.jsx` is just the device chrome —
ignore it.

## Fidelity
**High-fidelity.** Colors, type sizes, weights, radii, spacing, and copy in the
HTML are final. Recreate pixel-perfectly, but ALWAYS reference values through
the `DS` token object (mapping below), never as raw hex.

## Apply first: design-system patches
The `design_system_patches/` folder (PATCHES.md + Toaster.js +
react-native.config.js) fixes token-bypass colors, the no-line rule, the
radius floor, and sets up Manrope. Apply it BEFORE the redesigns — they assume
Manrope is loaded and tokens are used consistently.

## Design Tokens (hex → DS token)
All hexes in the HTML map to existing tokens in `src/styles/global.js`:
- #0b1326 → DS.colors.background
- #060d20 → DS.colors.surfaceContainerLowest (sunken inputs)
- #0e1730 → DS.colors.surfaceContainerLow (locked/teaser cards)
- #131b2e → DS.colors.surfaceContainer (cards)
- #171f33 → DS.colors.surfaceContainerHigh (chips)
- rgba(23,31,51,0.7) → DS.colors.surfaceContainerGlass (glass: pair with blur)
- #222a3e → DS.colors.surfaceContainerHighest (track, secondary button)
- #dae2fd → DS.colors.onSurface (headings/body)
- #d6c3b2 → DS.colors.onSurfaceVariant (secondary text)
- #ffddb8 → DS.colors.primary; #ffb95f → DS.colors.primaryBright
- #472a00 / #2b1800 → DS.colors.onPrimary
- Gradient CTA: linear-gradient(135deg, primary, primaryBright), text onPrimary
- Glow progress fill: linear-gradient(90deg, #ffddb8, #e8c49a) + shadow
  0 0 8–10px rgba(255,221,184,0.6) (use shadowColor/elevation or a wrapper View)
- Radii: 9999 full (buttons/chips/pills), 28 hero card, 24 cards/inputs,
  20 comment cards, 12–16 book covers
- Type: Manrope. Weights 800 (headings/CTAs), 700 (labels), 600/500 (body/sub).
  Sizes: 26 page title, 22 book title, 20 card title, 15–16 body/CTA,
  13 secondary, 11 caption/eyebrow (uppercase, letter-spacing 1)
- Shadows: cards 0 20px 40px rgba(11,19,38,0.4); CTA 0 8px 24px
  rgba(255,185,95,0.25); covers 0 12–16px 24–32px rgba(6,13,32,0.6)

## Navigation changes
Replace the current tab set with **3 tabs**: Home (book/book-outline),
Reading (bookmarks), Rooms (people). Tab bar: glass —
rgba(23,31,51,0.7) + blur (use @react-native-community/blur or
BlurView; fall back to solid surfaceContainerHigh if blur unavailable).
Active tint DS.colors.primary, inactive onSurfaceVariant, filled icon when
active, outline when not. Labels 11px, weight 700 active / 600 inactive.
- Join Room, Current Read, My Rooms tabs are REMOVED (merged into Reading + Rooms).
- Buckets/browse moves behind Home's "See all".
- Fix: Home header avatar navigates to a route that must exist ('Interest'
  crash from the review — register or rename the route).

## Screens

### 1a — Home ("Tonight")
File anchor: section id="1a". Replaces HomeScreen.js content.
- Header row (padding 18/24/6): "Good evening" 13/500 onSurfaceVariant over
  username 26/800 onSurface, letter-spacing -0.5. Right: notifications-outline
  24px with 16px primaryBright badge (count, 10/800 onPrimary), then 38px
  circle avatar (surfaceContainerHighest bg, initials 13/700 primary).
- Hero "Continue reading" card: surfaceContainer, radius 28, padding
  20/20/20/128, minHeight 172, ambient shadow. Book cover 112×156 absolutely
  positioned left:-8 top:-14, radius 16, rotate(-2deg), gradient cover, its own
  shadow. Inside: eyebrow "CONTINUE READING" 11/700 uppercase; title 20/800;
  "Chapter 7 of 21 · 62%" 13/500; 4px glow progress bar (track
  surfaceContainerHighest, radius full); overlapping 22px friend avatars
  (2px surface-color knockout ring, -7 margin) + "Priya & Tom are ahead —
  5 comments waiting" 12/600 (highlight span in primary).
- Full-width gradient CTA pill "Pick up where you left off" 15/800, marginTop 14.
- "Your rooms tonight": section header 16/800; horizontal row of pill chips
  (surfaceContainerHigh, radius full, padding 8 16 8 8): 32px gradient circle
  icon (chatbubbles), room name 13/700, status 11/600 (unread count in
  primaryBright, else onSurfaceVariant).
- "Curated for you" + "See all" link (12/700 primary): asymmetric 58%/42% card
  pair, second card align-self flex-end; cards surfaceContainer radius 24,
  cover aspect-ratio 0.78 radius 16, label 13/700 + count 11/500.
- Data needs: current book + progress %, chapter counts; room list with unread
  counts; friends-ahead summary (member progress vs mine).

### 1b — Reading tab (NEW screen)
Section id="1b". Replaces the Current Read tab.
- Top: full-width 4px progress bar (track surfaceContainerHigh, glow fill at 62%).
- Book header: 72×100 cover (radius 14) + eyebrow "READING NOW", title 22/800,
  "Chapter 7 of 21 · with Midnight Club" 13/500.
- "Where everyone is" card (surfaceContainer, radius 24, padding 18/20): a 6px
  pace track with member avatars (24px, 3px knockout ring) absolutely positioned
  at each member's % progress; my avatar in primary with onPrimary initials.
  Caption: "You're 3 chapters behind Tom. No spoilers — comments unlock as you
  read." 12/600 onSurfaceVariant.
- "Unlocked at Chapter 6": glass comment card (surfaceContainerGlass + blur,
  radius 20, padding 16) — avatar + name 12/700 + "· p. 148" 11; quoted passage
  in a sunken background-colored block (radius 12, Georgia/serif italic 12);
  comment body 13, line-height 1.45.
- Locked teaser card: surfaceContainerLow, radius 20; 36px lock-closed icon
  circle; "2 comments waiting at Chapter 9" 13/700 + "Keep reading to unlock
  them" 12/500.
- Gradient CTA pill "Continue Chapter 7".
- Data needs: per-member progress in the active room; comments with anchor
  position (chapter/page) and unlocked = anchor <= my progress; count of
  locked comments at next anchor.

### 1c — Rooms tab (merged Join + My Rooms)
Section id="1c".
- Title "Rooms" 26/800 + subtitle "Private clubs with your people — no set
  meeting time." 13.5/500.
- Action row: sunken "Enter invite code" field (surfaceContainerLowest, radius
  24, key-outline icon) + gradient "New" pill button (add icon) — replaces the
  whole Join Room screen; keep the existing join-by-code API call.
- Room cards (surfaceContainer, radius 24, padding 16): 56×78 cover (radius 12);
  name 15/800 + optional "3 new" badge (primaryBright pill, 10/800 onPrimary);
  book · status line 12/500; overlapping 20px member avatars (me first, in
  primary) + 3px group progress track.
- "Invite a friend" empty-state card: surfaceContainerLow, radius 24, centered
  mail-open-outline 28px, title 13/700, body 12/500 max-width 240.
- Data needs: rooms with book, member list, my unread comment count, group
  progress %; room create + join endpoints (exist).

### 1d — Login
Section id="1d". Restyle of LoginScreen.js.
- Vertically centered column, horizontal padding 32.
- Logo: src/assets/readpandaLogo_New.png (bundled in assets/), 190×190,
  borderRadius 95 (circle crop).
- Headline "Your book club,\non everyone's schedule" 28/800 centered,
  line-height 1.2; sub "Read together. Comment freely. No spoilers." 14/500.
- Inputs: sunken (surfaceContainerLowest, radius 24, padding 15/20, 15px), NO
  border. Placeholder color onSurfaceVariant.
- Primary CTA: gradient pill "Step inside" 15/800 (use
  react-native-linear-gradient or solid primary fallback).
- "or" divider: 1px lines at rgba-outline 30%.
- Secondary: solid surfaceContainerHighest pill "Continue with Google" 14/700
  in primary color text.
- Footer: "New here?" onSurfaceVariant + "Create an account" primary 700.

## Interactions & Behavior
- CTAs: press → opacity 0.85, scale 0.98 (Pressable). Continue reading /
  Continue Chapter → ManuscriptScreen with the active book.
- Room card tap → room detail (Reading tab scoped to that room, or existing
  room screen). Chip tap on Home → same.
- Enter invite code → inline expand or modal with the existing join flow;
  success toast via the new Toaster.
- Locked comment cards are non-interactive (no press feedback).
- All lists: pull-to-refresh; skeletons in surfaceContainerHigh at 60% opacity.

## State Management
Extend existing zustand stores:
- readingStore: activeBook {id, title, coverUrl, chapter, totalChapters,
  progressPct}, memberProgress [{userId, initials, progressPct}]
- roomsStore (exists as bucketsStore pattern): rooms [{id, name, book,
  members, unreadCount, groupProgressPct, status}]
- commentsStore: comments [{id, userId, anchor {chapter, page}, quote, body}],
  selector: unlocked = anchor.chapter <= myChapter
If backend endpoints for member progress / comment anchors don't exist yet,
stub with fixtures matching these shapes.

## Assets
- src/assets/readpandaLogo_New.png (bundled) — Login logo
- Manrope font files (download from Google Fonts; see design_system_patches)
- Icons: Ionicons via react-native-vector-icons — names used: notifications-outline,
  book/book-outline, bookmarks/bookmarks-outline, people/people-outline,
  chatbubbles, key-outline, add, lock-closed, mail-open-outline
- Book covers: real cover URLs from the API; gradient placeholders in the HTML
  are fallbacks only

## Files
- ReadPanda Design Review.dc.html — full review; redesigns at ids 1a, 1b, 1c, 1d
- ios-frame.jsx — device chrome only (ignore)
- assets/readpandaLogo_New.png
- design_system_patches/ — apply first (PATCHES.md, Toaster.js,
  react-native.config.js)
