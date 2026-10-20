# Bug reporting: Design

## Approach
We build our own sheet and send with `Sentry.captureFeedback`. We don't use
`feedbackIntegration` / `showFeedbackWidget`, because Sentry's form gives its
inputs 1px borders and has a fixed layout. Its only styling hooks are
`themeLight` / `themeDark` colours and per-element styles, so we'd be fighting
it to meet DESIGN.md. Our own form is a small component on the pattern the
Settings sheets already use.

**Sheet.** `SettingsSheets.js` already has a private `Sheet` (a bottom modal
with a grabber, dismissed by tapping the backdrop) and a `ConfirmSheet`. We
export `Sheet` and add `BugReportSheet` next to them. Inside it:
- A `TextInput` (multiline, `maxLength={2000}`) on a
  `DS.colors.surfaceContainerLowest` background, a sunken field per DESIGN.md
  §2, with no border.
- A single-line email `TextInput` on the same sunken background, labelled
  "Email (optional)", with the hint "Only if you'd like a reply about this
  report." It uses `keyboardType="email-address"`, `autoCapitalize="none"`,
  `autoCorrect={false}` and `textContentType="emailAddress"`, so iOS can
  suggest an address, but only when the reader taps the field. Its state starts
  as `''` every time the sheet mounts and is never read from `authStore` (R6.2).
  The trimmed value is checked with a simple `^[^\s@]+@[^\s@]+\.[^\s@]+$`.
  While it's non-empty and doesn't match, Send is disabled and the hint
  changes to "Enter a full email address, or leave this empty." in
  `DS.colors.error` (R6.4).
- An "Attach a screenshot" row that shows a thumbnail with a remove button
  once an image is picked.
- "Send" and "Cancel" buttons styled like `ConfirmSheet`'s.

`KeyboardAvoidingView` (`behavior="padding"`) wraps the sheet's content so it
rises above the keyboard (R2.4). Closing with text in either field asks first,
using the existing `ConfirmSheet` ("Discard this report?") (R2.6).

**Screenshot.** `launchImageLibrary` from `react-native-image-picker`, the
same library `src/utils/pickProfilePhoto.js` uses, with
`{ mediaType: 'photo', selectionLimit: 1, maxWidth: 1600, maxHeight: 1600, includeBase64: true }`.
The picker resizes the image (R3.4), and the base64 becomes a `Uint8Array`
for Sentry's attachment API. A cancel or error leaves the sheet as it was
(R3.3).

**Sending.** A new `sendBugReport({ message, email, image })` in
`src/utils/sentry.js` calls:

```js
Sentry.captureFeedback(
  { message, email: email || undefined, associatedEventId: recentEventId() },
  image ? { attachments: [{ filename: 'screenshot.jpg', data, contentType: 'image/jpeg' }] } : undefined,
);
```

The current scope adds the user (`{ id: uuid }`), release, dist, device
context and breadcrumbs, including the navigation breadcrumbs from
specs/sentry. We set no name, and `sendDefaultPii` stays false (R4.2). The
SDK (`@sentry/core` `captureFeedback`) puts `email` only into the feedback's
`contexts.feedback.contact_email` and leaves the scope's user alone. So a
typed email stays on this one report and never reaches the reader's other
events (R6.5). An empty field sends `undefined`, so no email at all (R6.3). `captureFeedback` hands the report to the SDK's transport, which
caches it while offline like any other envelope (R4.5). So "sent" means
handed to the SDK, and we toast as soon as the call returns (R4.4). It only
throws on a programming error, and then the sheet stays open (R4.6).

**Linking an error (R4.3).** `sentry.js` adds a `beforeSend` hook that
records `{ id: event.event_id, at: Date.now() }` for error events and returns
the event unchanged. `recentEventId()` returns that ID if it's under 5
minutes old, otherwise `undefined`. It's kept in memory only, so a report
after a relaunch isn't linked (the "this app session" in R4.3).

**Visibility (R1.2).** `sentry.js` exports `isSentryEnabled`
(`Boolean(SENTRY_DSN)`, the same flag `init` uses). The row renders only when
it's true.

## Files
| File | Change |
|------|--------|
| `src/utils/sentry.js` | modified: `isSentryEnabled`, `beforeSend` that tracks the recent event, `recentEventId()`, `sendBugReport()` |
| `src/screens/profile/SettingsSheets.js` | modified: export `Sheet`; new `BugReportSheet` with the description and optional email fields |
| `src/screens/profile/SettingsScreen.js` | modified: "Report a bug" row (icon `bug-outline`) after "Help & support"; sheet visibility state |
| `src/screens/profile/__tests__/BugReportSheet.test.js` | new: Send disabled when empty, max length, invalid email disables Send, empty email sends none, attach/remove, send calls `captureFeedback`, the discard confirmation |
| `jest.setup.js` | modified: add `captureFeedback` and `lastEventId` to the Sentry mock; mock `react-native-image-picker` |
| `ios/ReadPanda/Info.plist` | modified: `NSPhotoLibraryUsageDescription` → "ReadPanda uses your photo library so you can choose a profile photo or attach a screenshot to a bug report." |

## Data and state
- No new stores, API endpoints or persisted keys.
- Local state in `SettingsScreen`: `bugReportOpen`. In `BugReportSheet`:
  `message`, `email`, `image`, `sending`. None of it is persisted.
- In-memory module state in `sentry.js`: the last error event's ID and time.
- Sentry: reports appear under User Feedback for `readpanda-mobile`. The
  IP and location scrubbing from specs/sentry applies to them too. A contact
  email, when given, is shown on the report to org members only.

## Navigation
No route changes. The sheet is a `Modal` opened from Settings.

## Edge cases
- **Sentry off** (empty DSN): the row is hidden, so there's nowhere to send a
  report to.
- **Offline**: the report is queued by the SDK and the toast still shows.
- **Signed out**: Settings is only reachable when signed in, so a report always
  has a `uuid`.
- **Picker cancelled or permission denied**: no image, and the description is
  kept.
- **Large image**: the picker resizes it to 1,600px before base64, so the
  envelope stays small (Sentry's attachment limit is far larger).
- **Whitespace-only description**: Send stays disabled, and the message is
  trimmed before sending.
- **Email with spaces around it**: trimmed before it's checked and sent.
- **Invalid email**: Send stays disabled until it's fixed or cleared. The
  description is never lost.
- **Double tap on Send**: `sending` disables the button until the call returns.
- **iPad**: the sheet keeps the width cap the Settings sheets already have.
- **Larger text**: the field grows up to a max height and then scrolls inside
  itself, so the buttons stay on screen.

## Alternatives considered
- **Sentry's `feedbackIntegration` widget**: less code, but it has 1px
  bordered inputs, a fixed layout and Sentry branding to switch off. It
  doesn't meet the no-line rule without overriding most of its styles.
- **Shake to report**: easy to trigger by accident while reading. Left out
  for now (see Out of scope).
- **Capturing the screen automatically**: from a Settings row it would always
  be the Settings screen. Picking a real screenshot from Photos shows what the
  tester actually saw.
- **Prefilling the account email**: easier for the reader, but it would send
  PII by default and go against the no-PII rule from specs/sentry. An empty
  optional field means an email is only sent when the reader types one.
- **Requiring an email**: would stop people who just want to flag a problem.
