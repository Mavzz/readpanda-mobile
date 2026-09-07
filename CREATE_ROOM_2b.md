# Handoff: Create Room redesign (2b) — readpanda-mobile

Target: **Mavzz/readpanda-mobile @ master** (React Native, React Navigation,
zustand, react-native-vector-icons/Ionicons). Restyles the existing Create
Room screen/modal.

Reference: `ReadPanda Design Review.dc.html` section id="2b" — an HTML
prototype, NOT production code. Recreate in RN with existing patterns and
`DS` tokens from `src/styles/global.js`. Fidelity: high — sizes, weights,
radii, spacing, and copy below are final.

## Design intent
Creating a room is one decision (the name) plus one setting (privacy).
- REMOVE: the top-right gray "Create" chip; the bordered inputs; the big
  optional description textarea (deferred to room settings/page).
- ADD: privacy as two explicit tonal cards, INVITE-ONLY PRE-SELECTED (this is
  a private-friends product — flip the current default); a 1-2-3 strip
  promising the flow; one full-width gradient CTA at the bottom.
- On success: navigate straight to the new Room Detail screen (handoff
  ROOM_DETAIL_2a.md), which carries steps 2 and 3.

## Token mapping (hex → DS)
#0b1326 background · #060d20 surfaceContainerLowest · #0e1730
surfaceContainerLow · #171f33 surfaceContainerHigh · #222a3e
surfaceContainerHighest · #dae2fd onSurface · #d6c3b2 onSurfaceVariant ·
#ffddb8 primary · #ffb95f primaryBright · #472a00 onPrimary.
Font Manrope. CTA shadow 0/8/24 rgba(255,185,95,0.25).

## Layout (column, paddingHorizontal 24, below safe area)

### Header (row, gap 14, marginBottom 26)
- Close: 38×38 circle, bg surfaceContainerHigh, close icon 19px onSurface.
- Title "New room" 24/800 onSurface, letterSpacing -0.5.

### Name field
- Eyebrow "NAME YOUR ROOM" 11/700 onSurfaceVariant, uppercase,
  letterSpacing 1, marginBottom 10.
- TextInput: bg surfaceContainerLowest, radius 24, padding 16/20, 16/600
  onSurface, NO border; placeholder "e.g. Midnight Club" in onSurfaceVariant;
  selectionColor primary; autoFocus.
- Helper below (marginTop 8, marginHorizontal 6): "This is what your friends
  will see on the invite." 11/500 onSurfaceVariant.

### Privacy picker (marginTop 24)
- Eyebrow "WHO CAN JOIN" (same style).
- Row, gap 10, two flex:1 pressable cards, radius 20, padding 14:
  - Invite only (SELECTED default): bg surfaceContainerHigh + selection ring
    = 2px inset primary (RN: borderWidth 2, borderColor primary — the one
    sanctioned stroke, it's a selection state, not a divider; keep radius 20
    and compensate padding to 12 so content doesn't shift). Header row gap 7:
    lock-closed 15px + "Invite only" 13/800, both primary. Body "Only people
    with your code can join." 11/500 onSurfaceVariant, lineHeight 1.4.
  - Open (unselected): bg surfaceContainerLow, no ring. globe-outline 15px +
    "Open" 13/700 onSurfaceVariant; body "Anyone on ReadPanda can find it."
- Selecting swaps ring/bg between cards (opacity 0.85 + scale 0.98 on press).
- Note below (marginTop 8, marginHorizontal 6): "Add a description later from
  the room's page." 11/500 onSurfaceVariant.

### Spacer (flex:1), then footer

### Steps strip (centered row, gap 8, marginBottom 12)
12/600 onSurfaceVariant. Three items joined by 14×1 lines in
surfaceContainerHighest. Each: 18px circle numeral (10/800) + label.
Step 1 "Name": circle bg primary, numeral onPrimary. Steps 2 "Pick the book"
and 3 "Invite": circle bg surfaceContainerHighest, numeral onSurfaceVariant.

### CTA (marginBottom 28)
Full-width pill, gradient 135deg primary→primaryBright
(react-native-linear-gradient; solid primary fallback), radius full,
padding 16, centered: "Create room" 15/800 onPrimary.
Disabled while name is empty/whitespace: same pill at opacity 0.4 (tonal —
never gray). Keyboard: wrap in KeyboardAvoidingView so the CTA stays visible.

## Behavior
- Create → existing create-room API with {name: trimmed, isPrivate:
  privacy === 'invite'} (map to the API's current field; note the flipped
  default). Success → replace-navigate to Room Detail (2a) + toast "Room
  created" via the new Toaster. Failure → error toast, stay.
- Description is NOT collected here; if the API requires the field, send "".
- Data/store: roomsStore.createRoom(name, isPrivate) or existing equivalent.

## Prereq
Apply design_system_patches/ first (Manrope + Toaster) if not already done.
