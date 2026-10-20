# Legal links: Design

## Approach
**One place for the addresses (R1).** A new `src/utils/legalLinks.js`:

```js
export const SITE_URL = 'https://readpanda.vercel.app';
export const openLegalPage = (page) => // 'terms' | 'privacy'
  open(`${SITE_URL}/${page}`).catch(() => showToast(...));
```

Every Terms or Privacy link calls `openLegalPage`. On iOS, `open` is the
new native `SafariView` module; elsewhere, or if the module is missing,
it's `Linking.openURL`. If it rejects, the toast gives the address so the
reader can type it (R1.4).

**The in-app view (R1.1, R1.2, R1.5, R1.6).** `ios/SafariView.swift` (with
`SafariView.m` exposing it, as `WidgetBridge` does) has one method,
`open(url)`, which returns a promise.
- It presents an `SFSafariViewController` from
  `RCTPresentedViewController()`, the topmost controller. That's what makes
  it work over the paywall, which is itself a form sheet.
- It rejects anything that isn't http(s), and rejects if there's nothing to
  present from.
- `preferredControlTintColor` is `DS.Colors.primary` from
  `ReaderTheme.swift`, and the bar is dark (`DS.Colors.background`) to match
  the app. The dismiss button is "Done".
- The view sits on top of the screen that opened it, so closing it leaves
  that screen exactly as it was (R1.5). Safari's view always shows the
  address (R1.6).
- `SFSafariViewController` is part of iOS, so there's no new dependency and
  no pod.

**The agreement line (R2).** `src/screens/signUp/TermsLine.js` keeps its
place and style. It gets the new text, and its two links call
`openLegalPage`.
- Sign up already shows it in all three layouts in `SignUpLayouts.js`
  (R2.2).
- Login (`LoginScreen.js`) adds `<TermsLine />` under the "New here? Create
  an account" footer inside `form`. `form` is shared by every Login layout,
  so it shows on phone and iPad alike (R2.3).
- The new text is longer, so the line wraps to three lines within its
  300pt `maxWidth`. That's fine. Nothing sets `numberOfLines`, so larger
  text wraps further (R5.2).

**Settings (R3).** In `SettingsScreen.js`'s `aboutGroup`, the single
`comingSoon('Terms & privacy policy')` row becomes two `SettingsRow`s:
- "Terms of use" (icon `document-text-outline`, the current row's icon)
- "Privacy policy" (icon `lock-closed-outline`)

They sit where the old row was, after "Help & support" and "Report a bug".

**Paywall (R4).** In `PaywallScreen.js`, the two `Pressable`s call
`openLegalPage('terms')` and `openLegalPage('privacy')` instead of
`showToast`.

**Accessibility (R5).** The inline `Text` links in `TermsLine` already have
`accessibilityRole="link"`. The paywall's `Pressable`s gain
`accessibilityRole="link"` and labels. Settings rows are already buttons
with labels.

## Files
| File | Change |
|------|--------|
| `src/utils/legalLinks.js` | new: `SITE_URL`, `openLegalPage()` |
| `ios/SafariView.swift`, `ios/SafariView.m` | new: presents the in-app Safari view |
| `ios/ReadPanda.xcodeproj/project.pbxproj` | modified: adds the two files to the app target |
| `src/screens/signUp/TermsLine.js` | modified: 18+ text; links open the pages |
| `src/screens/LoginScreen.js` | modified: shows `TermsLine` under the footer |
| `src/screens/profile/SettingsScreen.js` | modified: "Terms of use" and "Privacy policy" rows |
| `src/screens/PaywallScreen.js` | modified: links open the pages |
| `src/utils/__tests__/legalLinks.test.js` | new: URLs for both pages; native view on iOS; browser fallback; toast when opening fails |

## Data and state
None: no stores, endpoints or persisted keys.

## Navigation
None. The Safari view is presented natively on top of whatever is showing;
React Navigation doesn't know about it.

## Edge cases
- **Offline:** the Safari view shows its own offline page, and Done
  brings the reader straight back.
- **Double tap:** if the topmost controller is already a Safari view, the
  second tap does nothing, so two pages never stack.
- **The site isn't at `readpanda.vercel.app` yet:** until the portal moves
  off that address, the links show the portal's login. The release that
  ships this must come after the site is deployed there (see the open
  question).
- **The help screen spec** (specs/help-support) adds its own Settings
  changes. Whichever merges second rebases onto the other; the rows don't
  overlap.

## Alternatives considered
- **Plain Safari (`Linking.openURL`):** no native code, but it takes the
  reader out of the app, and some don't find their way back. This was the
  first design; changed 2026-10-21 at review.
- **A library (`react-native-inappbrowser-reborn`):** the same Safari view,
  but it's old-architecture code on a Fabric app, for one method.
- **`react-native-webview` screen:** our own header, but no address bar or
  Safari's trust signals, and a new native dependency.
- **A checkbox for 18+:** a stronger record, but an extra tap on every
  sign-up, including Apple and Google. Not chosen (decided 2026-10-20).
- **One "Terms & privacy" row opening a chooser:** fewer rows, but an extra
  step to reach either page.
