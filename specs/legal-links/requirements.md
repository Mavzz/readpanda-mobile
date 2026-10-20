# Legal links: Requirements

Status: Approved <!-- Draft → Approved -->
Design handoff: none (changes text and links on existing screens)

## Goal
The App Store won't accept ReadPanda until its Terms and Privacy Policy are
real pages the app links to. Every link to them today shows a "coming soon"
toast:
- the "By continuing you agree…" line on Sign up
- the paywall's Terms and Privacy links
- Settings → "Terms & privacy policy"

The pages now exist on the public site (readpanda `site/`: `/terms`,
`/privacy`). This points every link at them.

ReadPanda is also 18+ (privacy policy and terms), but nothing in the app
says so. This adds the age to the line readers agree to. It also adds that
line to Login, where Continue with Apple or Google can create an account
without ever seeing Sign up.

## Out of scope
- An age checkbox or date-of-birth field. Readers confirm by continuing.
- Asking existing accounts to agree again
- Recording on the server which version of the terms someone agreed to
- Android. The app ships on iOS; elsewhere the links fall back to the browser.
- The page text itself (readpanda `site/`)
- Report, block and remove (a separate spec)

## Requirements

### R1. Where the links go
**User story:** As a reader, I want "Terms" and "Privacy" to open the actual
documents, so that I can read what I'm agreeing to.

**Acceptance criteria**
1. WHEN the reader taps any Terms link THE app SHALL show
   `https://readpanda.vercel.app/terms` in an in-app Safari view, without
   leaving ReadPanda.
2. WHEN the reader taps any Privacy link THE app SHALL show
   `https://readpanda.vercel.app/privacy` the same way.
3. THE site's address SHALL be defined in one place in the app.
4. IF the page can't be opened THEN THE app SHALL show the toast "Couldn't
   open the page. It's at readpanda.vercel.app/<page>."
5. WHEN the reader taps Done THE view SHALL close and the reader SHALL be
   back on the screen they came from, as they left it (a half-filled Sign up
   form or the paywall included).
6. THE view SHALL show the page's address and use ReadPanda's accent
   colour for its controls.

### R2. The agreement line
**User story:** As someone creating an account, I want to know the age
requirement and the terms before I continue.

**Acceptance criteria**
1. THE line SHALL read "By continuing you confirm you're 18 or older and
   agree to the Terms and Privacy Policy.", with "Terms" and "Privacy
   Policy" as links (R1).
2. THE line SHALL show wherever it shows today on Sign up: the phone layout,
   the iPad card and the wide layout.
3. THE line SHALL also show on Login, below "Create an account", in every
   Login layout.
4. THE "coming soon" toasts in the line SHALL be gone.

### R3. Settings
**User story:** As a reader, I want to find the terms and privacy policy
again after signing up.

**Acceptance criteria**
1. THE About group SHALL replace "Terms & privacy policy" with two rows:
   "Terms of use" and "Privacy policy". They SHALL keep the same position
   in the group.
2. WHEN the reader taps either row THE app SHALL open that page (R1).

### R4. Paywall
**User story:** As a reader thinking about ReadPanda+, I want the Terms and
Privacy links next to the price to work, as Apple requires.

**Acceptance criteria**
1. WHEN the reader taps "Terms" or "Privacy" on the paywall THE app SHALL
   open that page (R1) instead of showing a toast.

### R5. Accessibility
**Acceptance criteria**
1. EACH link SHALL be announced as a link with its name ("Terms", "Privacy
   Policy").
2. WHEN the text size is larger THE agreement line SHALL wrap, not be cut
   off.

## Open questions
- [x] The site's address assumes the public site gets `readpanda.vercel.app`
      (moving the portal to another address first). If it ends up elsewhere,
      only the constant in R1.3 changes. Resolved 2026-10-21: the site is live
      there.
