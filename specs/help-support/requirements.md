# Help & support: Requirements

Status: Approved <!-- Draft → Approved -->
Design handoff: none (follows the Settings sub-screen pattern of NotificationSettingsScreen and docs/DESIGN.md)

## Goal
"Help & support" in Settings only shows a "coming soon" toast today. A reader
who is stuck ("why can't I see the comments?", "how do I report someone?")
has nowhere to look and no way to reach us. This turns the row into a Help &
support screen with:
- short answers to the common questions, built into the app so they work
  offline
- two ways to reach us: an email to the support address, and the existing
  Report a bug sheet

## Out of scope
- Terms and privacy links (done in specs/legal-links; Settings has them)
- In-app reporting and blocking (a separate spec; until then, reports come
  by email, as the terms say)
- A web help centre, search, or answers that can change without an app update
- Live chat, or a support inbox inside the app
- Sending questions to the backend; email goes through the reader's own mail app
- Android-specific work beyond what the shared JS gives

## Requirements

### R1. Entry point
**User story:** As a reader, I want "Help & support" to actually open help, so
that I'm not told "coming soon" when I'm stuck.

**Acceptance criteria**
1. WHEN the reader taps "Help & support" in Settings THE app SHALL open the
   Help & support screen instead of showing a toast.
2. THE Help & support screen SHALL have a back button that returns to
   Settings.

### R2. Common questions
**User story:** As a reader, I want quick answers to common questions, so that
I can sort things out myself without waiting for a reply.

**Acceptance criteria**
1. THE screen SHALL list the common questions as rows showing only the
   question.
2. WHEN the reader taps a question THE row SHALL expand to show its answer.
   WHEN they tap it again THE row SHALL collapse.
3. THE screen SHALL allow more than one answer open at a time.
4. THE answers SHALL be built into the app and SHALL show without a network
   connection.
5. WHILE ReadPanda+ is off (specs/plus-off-switch) THE screen SHALL NOT
   show questions about ReadPanda+, and no answer SHALL mention it or a
   free-plan limit.
6. WHERE an answer points to a setting or tab THE answer SHALL name it exactly
   as it appears in the app (for example "Settings → Who sees my progress").
7. WHILE ReadPanda+ is on, WHERE an answer states a free-plan limit THE
   number SHALL come from `FREE_LIMITS`, so it always matches the paywall.

### R3. Email us
**User story:** As a reader, I want to email someone when the answers don't
help, so that a person can reply to me.

**Acceptance criteria**
1. THE screen SHALL have an "Email us" row that shows the support address.
2. WHEN the reader taps "Email us" THE app SHALL open a new email in the
   reader's mail app, addressed to the support address, with the subject
   "ReadPanda help".
3. THE email body SHALL start empty for the reader's message, with the app
   version (as shown at the bottom of Settings) and the iOS version below it. It SHALL NOT include the reader's
   username, email or `uuid`.
4. IF no mail app can open the email THEN THE app SHALL copy the support
   address to the clipboard and SHALL show the toast "Email address copied —
   paste it into your mail app".

### R4. Report a bug
**User story:** As a reader who has hit a bug, I want to report it from the
help screen, so that I don't have to go back to Settings to find the right
place.

**Acceptance criteria**
1. WHEN Sentry is turned on THE screen SHALL show a "Report a bug" row that
   opens the existing bug report sheet (specs/bug-reporting).
2. IF Sentry is turned off THEN THE screen SHALL NOT show the row.
3. WHEN a report is sent from this screen THE app SHALL behave as it does
   from Settings: the sheet closes and the toast "Thanks — your report was
   sent" shows.
4. THE "Report a bug" row in Settings SHALL stay where it is.

### R5. Look and accessibility
**User story:** As a reader, I want the screen to feel like the rest of
Settings, and to work with VoiceOver and larger text.

**Acceptance criteria**
1. THE screen SHALL use the Settings layout (`SettingsGroup`, the back button
   and title of NotificationSettingsScreen), only `DS` tokens and Manrope,
   and no 1px borders between surfaces.
2. EACH question row SHALL be announced as a button whose state says whether
   its answer is expanded or collapsed.
3. WHEN the text size is larger THE questions and answers SHALL wrap rather
   than be cut off.
4. WHEN the window is iPad-sized THE content SHALL be no wider than
   `DS.layout.textMax`, centred.
5. THE screen SHALL end with the app version, as Settings does.

## Open questions
- [x] Support email address (R3): `readpanda.support@gmail.com`. A dedicated
      Gmail for now; moving to a domain later changes `SUPPORT_EMAIL` and needs
      an app update.
- [x] The question list (design.md, "Questions"): approved 2026-10-21.
