# Bug reporting: Requirements

Status: Approved <!-- Draft → Approved -->
Design handoff: none (built from existing Settings sheet patterns and docs/DESIGN.md)

## Goal
Crashes reach Sentry on their own (specs/sentry), but a tester who hits a bug
that doesn't crash ("the comment sheet hides my text", "this page is blank")
can only tell us in a message, and that message comes with no device, build or
screen history. This adds a "Report a bug" row in Settings. It opens a short
form that sends the tester's description to Sentry User Feedback, optionally
with a screenshot from Photos. Sentry attaches the reader's `uuid`, the
build, the device and the recent screens. Readers who want a reply can leave
an email; nobody has to.

## Out of scope
- Shake to report
- Showing the row only in tester builds. Every distributed build is an Ad Hoc
  tester build today; revisit when an App Store lane exists.
- A name field. Sentry already has the reader's `uuid`.
- Capturing the screen automatically, and recording a session (Session Replay)
- Replying inside the app, or showing the status of a report. Replies go by
  email, to readers who left one (R6).
- Android-specific work beyond what the shared JS gives

## Requirements

### R1. Entry point
**User story:** As a tester, I want an obvious place to report a bug, so I
don't have to remember who to message or what to include.

**Acceptance criteria**
1. WHEN Sentry is turned on (`SENTRY_DSN` is set) THE Settings screen SHALL
   show a "Report a bug" row in the About group, after "Help & support".
2. IF Sentry is turned off THEN THE Settings screen SHALL NOT show the row.
3. WHEN the tester taps the row THE app SHALL open the bug report sheet.

### R2. Writing the report
**User story:** As a tester, I want to describe what went wrong in my own
words, quickly, without filling in details the app already knows.

**Acceptance criteria**
1. THE sheet SHALL have a multi-line description field, the optional email
   field from R6, a "Send" button and a "Cancel" button, and no name field.
2. WHILE the description is empty or only whitespace THE "Send" button SHALL
   be disabled.
3. THE description field SHALL accept at most 2,000 characters.
4. WHEN the keyboard opens THE sheet SHALL stay above it, so the field and
   the "Send" button stay visible.
5. WHEN the tester taps "Cancel" or outside the sheet THE sheet SHALL close
   without sending anything.
6. IF the tester has typed a description or an email THEN closing the sheet
   SHALL ask them to confirm before throwing it away.

### R3. Optional screenshot
**User story:** As a tester, I want to attach a screenshot of the bug, so the
developer can see what I saw.

**Acceptance criteria**
1. THE sheet SHALL offer an "Attach a screenshot" action that opens the
   photo library. No image SHALL be attached unless the tester picks one.
2. WHEN the tester picks an image THE sheet SHALL show its thumbnail with a
   way to remove it.
3. IF the tester cancels the photo picker or picking fails THEN THE sheet
   SHALL keep the description and send without an image.
4. THE sheet SHALL attach at most one image, scaled down so its longest side
   is no more than 1,600px.

### R4. Sending
**User story:** As a tester, I want to know my report went through, and not
lose it if my connection drops.

**Acceptance criteria**
1. WHEN the tester taps "Send" THE app SHALL send the description to Sentry
   User Feedback, with the screenshot as an attachment if there is one.
2. THE report SHALL carry the reader's `uuid` (from specs/sentry R4), the
   release and build, the device, and the recent screens. It SHALL NOT include
   the reader's name, username or account email. The only email it may carry
   is one typed into the sheet (R6).
3. IF an error was reported to Sentry in the last 5 minutes of this app
   session THEN THE report SHALL be linked to that error.
4. WHEN the report has been handed to Sentry THE sheet SHALL close and THE app
   SHALL show the toast "Thanks — your report was sent".
5. IF the device is offline THEN THE SDK SHALL keep the report and send it
   once the device is back online, and THE app SHALL still show the toast
   from R4.4.
6. IF sending throws THEN THE sheet SHALL stay open with the description
   intact and SHALL show an error message inside the sheet. (A toast would
   be hidden behind the sheet's Modal.)

### R5. Look and accessibility
**User story:** As a tester, I want the form to feel like part of ReadPanda,
and to work with VoiceOver and larger text.

**Acceptance criteria**
1. THE sheet SHALL reuse the Settings sheet pattern (`SettingsSheets.js`) and
   use only `DS` tokens and Manrope. Surfaces SHALL be separated by a change
   of background, never by 1px borders.
2. THE description field, email field, screenshot action and buttons SHALL
   have accessibility labels. The disabled "Send" button SHALL announce that it's
   disabled.
3. WHEN the window is iPad-sized THE sheet SHALL be no wider than the
   existing Settings sheets.

### R6. Optional contact email
**User story:** As a reader, I want to leave my email if I'd like to hear back
about my report, without having to share it when I don't.

**Acceptance criteria**
1. THE sheet SHALL have an email field labelled as optional, with a hint
   that the email is only used to reply about this report.
2. WHEN the sheet opens THE email field SHALL be empty. THE app SHALL NOT
   fill it from the reader's account or remember it between reports.
3. IF the email field is empty THEN THE report SHALL be sent without an
   email.
4. IF the email field has text that isn't a valid email address THEN THE
   "Send" button SHALL be disabled and THE field SHALL say why.
5. WHEN the reader fills in the email field THE report SHALL carry it as the
   feedback's contact email. THE app SHALL NOT set it on the Sentry user, so
   it doesn't appear on the reader's other events. (Sentry's server copies
   the contact email onto the report's own user when it stores the report.
   That stays on the report.)

## Open questions
- [x] Photo library permission text: it will also mention bug-report
      screenshots (task 4).
- [x] Linking window (R4.3): 5 minutes stays.
- [x] Contact email: optional, empty by default, never prefilled (R6).
- [ ] Privacy policy: once "Terms & privacy policy" is a real page, it should
      say that an email left on a bug report is kept in Sentry. This doesn't
      block the feature.
