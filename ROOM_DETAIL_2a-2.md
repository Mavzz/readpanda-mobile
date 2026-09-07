# Handoff: Room Detail redesign (2a) — readpanda-mobile

Target: **Mavzz/readpanda-mobile @ master** (React Native, React Navigation,
zustand, react-native-vector-icons/Ionicons). Restyles the existing Room
Detail screen (the screen reached from a room card, showing invite code /
about / currently reading / members).

Reference: `ReadPanda Design Review.dc.html` section id="2a" — an HTML
prototype, NOT production code. Recreate it in RN using existing patterns and
`DS` tokens from `src/styles/global.js`. Fidelity: high — sizes, weights,
radii, spacing, and copy below are final.

## Design intent
A brand-new room has two jobs: decide what to read, get friends in. The screen
is an ordered setup flow, not a fact sheet.
Reading model: a room reads EITHER a standalone book OR a bucket (a shared
reading list) — with a bucket, the room also has a "current book" chosen from
it; shared progress + comment unlocking always track the current book.
- REMOVE: the ABOUT section (until rooms have a real description field), the
  bordered/glowing invite-code card, dead-end empty states.
- ADD: creator shown as member #1; book/bucket picker CTAs; Share/QR invite
  actions.

## Token mapping (hex in HTML → DS)
#0b1326 background · #060d20 surfaceContainerLowest · #0e1730
surfaceContainerLow · #131b2e surfaceContainer · #171f33 surfaceContainerHigh ·
#222a3e surfaceContainerHighest · #dae2fd onSurface · #d6c3b2 onSurfaceVariant ·
#ffddb8 primary · #ffb95f primaryBright · #472a00 onPrimary.
Font: Manrope (see design-system patches). Card shadow: 0/20/40
rgba(11,19,38,0.4). CTA shadow: 0/8/24 rgba(255,185,95,0.25).

## Layout (top → bottom, ScrollView, paddingHorizontal 24)

### Header (paddingTop below safe area, row, gap 14)
- Back button: 38×38 circle, bg surfaceContainerHigh, chevron-back 19px onSurface.
- Room name: 24/800 onSurface, letterSpacing -0.5.
- Subtitle: 12/600 onSurfaceVariant — "Just created · 1 member" (derive:
  "{n} member(s)"; once reading: "{currentBook title} · {n} members", with
  "· from {bucket name}" appended when reading through a bucket).

### Section eyebrows (all three sections)
11/700 onSurfaceVariant, uppercase, letterSpacing 1, marginBottom 10.
Copy: "FIRST, DECIDE WHAT TO READ" · "THEN, BRING YOUR PEOPLE" · "MEMBERS · {n}".
Section spacing: marginTop 28 (24 for the first).

### Reading card — 3 states

STATE A — empty (no book, no bucket):
Card: surfaceContainer, radius 24, padding 18, row gap 16, ambient shadow.
- Cover placeholder: 56×78, radius 12, bg surfaceContainerLowest, centered
  book-outline 24px onSurfaceVariant.
- Title "Nothing on the shelf yet" 15/800 onSurface; body "Pick one book — or
  a bucket, a whole reading list to work through together." 12/500
  onSurfaceVariant, lineHeight 1.4.
Primary CTA (marginTop 12): full-width pill, gradient 135deg
primary→primaryBright (react-native-linear-gradient; solid primary fallback),
padding 15, radius full, centered row gap 8: search icon 17px + "Choose a book"
15/800 onPrimary → book picker (reuse the CreateBucket/browse picker).
Secondary CTA (marginTop 10): full-width pill, bg surfaceContainerHighest,
radius full, padding 13, centered row gap 7: albums-outline 16px + "Read
through a bucket" 13/700 primary → bucket picker (user's buckets +
shared/public ones if they exist). Picking a bucket sets room.bucket, then
immediately prompts "Which book first?" from that bucket's books.

STATE B — bucket set, current book set:
Replace with the cover-led progress hero from section 1b (72×100 cover, title
22/800, chapter line, glow progress bar), PLUS an "Up next" strip below it:
eyebrow "UP NEXT IN {BUCKET NAME}" 11/700, then a horizontal row of the
bucket's remaining covers (44×62, radius 10, gap 8) with a count chip.
"Finish book → choose next" is a room action (creator or vote — keep simple:
creator picks) that swaps room.currentBook.

STATE C — standalone book set (no bucket):
The 1b progress hero alone. Offer "Add a bucket" as a small text action under
it (12/700 primary) so rooms can graduate to a reading list later.

### Invite card
Card: surfaceContainer, radius 24, padding 20, ambient shadow.
- Code well: bg surfaceContainerLowest, radius 16, padding 14/18, row
  space-between: code 24/800 primary, letterSpacing 6 (uppercase); Copy control
  = copy-outline 16px + "Copy" 12/700 onSurfaceVariant. NO border, NO glow.
- Action row (marginTop 12, gap 10): two flex:1 pills, bg
  surfaceContainerHighest, radius full, padding 12, centered row gap 7,
  text 13/700 primary: [share-outline] "Share invite" (RN Share.share with the
  code) · [qr-code-outline] "QR code" (modal; react-native-qrcode-svg, or omit
  the button if not adding the dep).
- Caption: "Anyone with the code can join this room" 11/500 onSurfaceVariant,
  centered, marginTop 12.
- Copy → clipboard + success toast via the new Toaster ("Invite code copied").

### Members list (column, gap 10)
- Member row: bg surfaceContainer, radius 20, padding 12/16, row gap 12.
  Avatar 36px circle — creator/self: bg primary, initials 12/800 onPrimary;
  others: surfaceContainerHighest bg, initials in primary. Name 14/700
  onSurface with "(you)" 600 onSurfaceVariant suffix for self; role/status
  line 11/600 onSurfaceVariant ("Room creator" / "Joined {date}").
- Waiting row (only while members < 2): bg surfaceContainerLow, radius 20,
  padding 12/16: 36px circle surfaceContainerHigh with person-add-outline 15px
  onSurfaceVariant + text "Waiting for friends — share the code above and
  they'll appear here." 12/600 onSurfaceVariant, lineHeight 1.4.

## Behavior
- Pressables: opacity 0.85 + scale 0.98 on press.
- Data: room {name, code, createdAt, bucket? {id, name, bookIds[]},
  currentBook?, members[{id, name, initials, isCreator, joinedAt}]} — from the
  existing room store/API; current user is always in members. Invariant:
  bucket set ⇒ currentBook ∈ bucket; progress/comments always key on
  currentBook. Reuse bucketsStore for the bucket picker.
- No borders anywhere on this screen (no-line rule). All corners ≥ radius 16.

## Prereq
Apply design_system_patches/ first (Manrope + Toaster) if not already done.
