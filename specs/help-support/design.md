# Help & support: Design

## Approach
A new stack screen, `HelpScreen`, built like `NotificationSettingsScreen`:
- `SafeAreaView`, a `ScrollView` and the 38pt back button with a title
- `SettingsGroup` cards with `profileStyles`
- `useLayout` for iPad padding

Settings' "Help & support" row changes from `comingSoon(...)` to
`navigation.navigate('Help')` (R1).

The screen has three parts, top to bottom:

1. **Common questions** (R2), in a `SettingsGroup` titled "Common questions".
   Each question is a `HelpQuestion` row (new, in the same file):
   - The question, wrapping across lines, with a chevron that points down
     when open and right when closed.
   - Tapping toggles the answer below the question, in `DS.type.body` and
     `DS.colors.body`.
   - Each row keeps its own `open` state, so several answers can be open at
     once (R2.3).
   - Accessibility: `accessibilityRole="button"` and
     `accessibilityState={{ expanded: open }}` (R5.2).
   - No animation beyond the layout change. The answers are short, and
     `LayoutAnimation` is unreliable on Fabric.
2. **Get in touch** (R3, R4), in a `SettingsGroup` titled "Get in touch":
   - an "Email us" `SettingsRow` (icon `mail-outline`) with the address as
     its value
   - a "Report a bug" row (icon `bug-outline`), shown only when
     `isSentryEnabled`
3. **Footer:** "ReadPanda {version}", styled like Settings' footer (R5.5).

**Questions.** These live in `src/screens/profile/helpTopics.js`, kept
apart from the screen so they're easy to edit. It exports
`helpTopics(plusEnabled)`, which returns `{ id, question, answer }[]`:
- Questions marked `plus` are left out while ReadPanda+ is off (R2.5).
- Answers that state a limit add that sentence only while it's on, with
  the numbers from `FREE_LIMITS` (R2.7).

`HelpScreen` calls it with `isPlusEnabled` from `purchasesService`. A
function rather than a constant keeps it testable both ways.

This is the list for approval (see the open question in requirements.md):

| id | Shown | Question | Answer |
|----|-------|----------|--------|
| `comments` | always | Why can't I see some comments? | Comments in a room are pinned to the page they're about. You see a comment once you've read up to that page, so nobody spoils what's ahead. Keep reading and they'll appear. |
| `join` | always | How do I join a room? | Open the invite link or scan the QR code a member shares, or go to the Rooms tab and enter the room's invite code. |
| `start` | always | How do I start a room? | Go to the Rooms tab and tap New, then share its invite code, link or QR code from the room. *Plus on, adds:* Free accounts host {hostedRooms} room. |
| `progress` | always | Who can see how far I've read? | Room members, by default. To hide it, go to Settings → Who sees my progress and choose Only me. |
| `reading` | always | How do I change how books look? | Go to Settings → Page turning to choose Scroll or Page, and Settings → Page theme for Paper, Sepia or Night. |
| `report` | always | How do I report a comment or a reader? | Email us at the address below with the room, the reader's username and what happened. We review every report and act promptly. |
| `delete` | always | How do I delete my account? | Go to Settings → Delete account. Your reading history, buckets and highlights are deleted, rooms you created pass to another member, and your comments stay as "Deleted reader". This can't be undone. |
| `plus` | Plus on | What does ReadPanda+ add? | Reading stays free. ReadPanda+ lets you host as many rooms as you like and keep unlimited buckets (free accounts host {hostedRooms} room and keep {customBuckets} buckets). |
| `restore` | Plus on | I paid for ReadPanda+ but don't have it | Open ReadPanda+ from Settings and tap Restore, while signed in to the same Apple ID you paid with. |
| `cancel` | Plus on | How do I cancel ReadPanda+? | Only Apple can cancel a subscription: go to iPhone Settings → your name → Subscriptions → ReadPanda. Deleting your ReadPanda account doesn't cancel it. |

Changes from the first draft:
- `start` no longer states a member cap. The paywall says 5, but nothing
  enforces it (specs/plus-off-switch), so the help shouldn't promise it.
- `plus` lists only what the app gates today; it doesn't mention 25
  readers, schedules, polls, export or themes.
- `report` is new. Until in-app reporting exists, this is how the terms say
  to report, and App Review looks for a way to do it. When the report/block
  spec lands, its answer changes.

Spoiler protection is left out on purpose. The setting is saved, but nothing
reads it yet, so an answer would promise something the app doesn't do.

**Email us (R3).** A new `src/utils/support.js` exports:
- `SUPPORT_EMAIL = 'readpanda.support@gmail.com'`, a constant. It's the same
  address in dev and prod, and it isn't secret.
- `emailSupport()`, which builds this URL:

```
mailto:${SUPPORT_EMAIL}?subject=ReadPanda%20help&body=${encodeURIComponent(body)}
```

The body is two blank lines, then `—`, then `ReadPanda ${packageJson.version}`
and `iOS ${Platform.Version}`. It has no user fields (R3.3). The function
calls `Linking.openURL`. If that rejects, which happens when there's no mail
account or Mail was deleted, it calls `Clipboard.setString(SUPPORT_EMAIL)`
and shows the copied toast (R3.4). It uses `Clipboard` from `react-native`,
like `InviteSection.js`. It doesn't call `canOpenURL`, because that needs
`LSApplicationQueriesSchemes` and still can't tell whether an account is set
up.

**Report a bug (R4).** `HelpScreen` renders its own `BugReportSheet`, with an
`onSent` that closes the sheet and shows the same toast as Settings (R4.3).
Settings keeps its row and sheet (R4.4).

## Files
| File | Change |
|------|--------|
| `src/screens/profile/HelpScreen.js` | new: the screen and `HelpQuestion` |
| `src/screens/profile/helpTopics.js` | new: `helpTopics(plusEnabled)`, the questions and answers |
| `src/utils/support.js` | new: `SUPPORT_EMAIL`, `emailSupport()` |
| `src/navigation/MainStackNavigator.js` | modified: `Help` route beside `Settings` |
| `src/screens/profile/SettingsScreen.js` | modified: "Help & support" navigates to `Help` |
| `src/screens/profile/__tests__/HelpScreen.test.js` | new: tests for expand/collapse, several open at once, ReadPanda+ questions hidden while off, the limits from `FREE_LIMITS` while on, the mailto URL and body, the copy fallback, and the bug row hidden when Sentry is off |

## Data and state
- No stores, API endpoints or persisted keys.
- Local state: each `HelpQuestion`'s `open`, and `bugReportOpen` in
  `HelpScreen`.
- Screen tracking: `useScreenTracking('HelpScreen')`.

## Navigation
- New route `Help` (no params) in `MainStackNavigator`, beside `Settings`.
  It draws its own back button, like the other Settings screens.
- No deep link.

## Edge cases
- **Offline:** the answers are bundled, so they still show (R2.4). Mail
  queues the email itself. A bug report queues in the SDK.
- **No mail account:** the address is copied and a toast says so (R3.4). The
  address is also shown on the row, so it can be typed by hand.
- **Sentry off:** no "Report a bug" row, but email still works.
- **Larger text:** the question rows grow; there's no `numberOfLines` on the
  question or answer (R5.3). The "Email us" row uses `SettingsRow`, which
  truncates its value to one line. That's fine, because the full address is
  in the email and the copy fallback.
- **iPad:** content is capped at `DS.layout.textMax` and centred (R5.4).
  There's no two-column layout like Settings', since one list reads better
  here.
- **A limit changes in `FREE_LIMITS`:** the answers follow automatically.
- **ReadPanda+ turned on later:** the three ReadPanda+ questions and the
  limit sentences appear with no other change.

## Alternatives considered
- **A web help page:** easy to update without a release, but needs a site,
  and it doesn't work offline.
- **Questions through the bug report sheet:** one channel fewer, but
  questions would land among crash reports in Sentry, with no reply path
  unless the reader leaves an email.
- **One answer open at a time:** tidier, but readers comparing two answers
  (restore and cancel, say) would lose their place.
- **Including the `uuid` in the email:** it would help find the account, but
  it's a support email the reader can read and forward, so we keep it to
  version info. We can ask for more in the reply.
