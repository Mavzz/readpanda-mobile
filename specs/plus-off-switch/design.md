# ReadPanda+ off switch: Design

## Approach
**One flag (R1).** `src/services/purchasesService.js` already owns the
RevenueCat key, so it owns the switch too:

```js
import { PLUS_ENABLED, REVENUECAT_IOS_KEY, REVENUECAT_ANDROID_KEY } from '@env';
// On only when asked for and there's a key to sell with.
export const isPlusEnabled = PLUS_ENABLED === 'true' && Boolean(apiKey);
```

`react-native-dotenv` runs with `allowUndefined: true`, so a `.env` without
the line imports `undefined`, which is off (R1.2). Requiring the key as
well means a build can never show a paywall it can't sell from.

**RevenueCat stays quiet (R3.3).** `configurePurchases` returns `false`
when `isPlusEnabled` is false, the same path as a missing key today:
- `identify` returns `null`, so `subscriptionStore.start` sets
  `isPlus: false` and never subscribes to updates.
- `refresh` and `loadOffering` already return early when
  `isPurchasesConfigured()` is false.
- `forget` does nothing.

No store changes are needed.

**The gate (R2).** In `usePlusGate`, the first check becomes
`!isPlusEnabled || __DEV__ || isPlus || withinFreeTier(...)`. With
ReadPanda+ off every create action runs, and the gate never navigates to
`Paywall` (R2.1, R2.2). All seven gate calls go through this one hook:
- Home
- Rooms
- My Books
- Bucket grid
- Book detail (rooms and buckets)
- Solo book

**Settings (R2.2, R3.1, R3.2).** In `SettingsScreen.js`:
- `plusGroup` renders only when `isPlusEnabled`. It's the one direct
  route to the paywall, so this also closes the last way in (R2.2).
- The Delete account note is already conditional on `isPlus`, which is
  always false while off. It changes to `isPlusEnabled && isPlus` so
  the rule is visible where it's applied (R3.2).

**Paywall route.** `Paywall` stays registered in `MainStackNavigator`. With
nothing navigating to it, it's unreachable, and leaving it registered keeps
the switch a one-line change.

## Files
| File | Change |
|------|--------|
| `src/services/purchasesService.js` | modified: `isPlusEnabled`; `configurePurchases` respects it |
| `src/hooks/usePlusGate.js` | modified: no limits while off |
| `src/screens/profile/SettingsScreen.js` | modified: hide the ReadPanda+ group and Delete account note while off |
| `.env.example` | modified: documents `PLUS_ENABLED` |
| `src/hooks/__tests__/usePlusGate.test.js` | new: off runs the action at the limit; on opens the paywall at the limit |

## Data and state
- New env key `PLUS_ENABLED` (`true` to turn on). The `.env.dev` and
  `.env.prod` files are gitignored, so add it there by hand; leaving it out
  means off.
- No store, endpoint or persisted-key changes.

## Navigation
None. The `Paywall` route stays registered but nothing navigates to it
while off.

## Edge cases
- **A tester who bought ReadPanda+ in the sandbox:** with the switch off
  the app never asks RevenueCat, so it treats them as free. That's harmless,
  because free has no limits while off.
- **Development builds:** `__DEV__` already skips the limits. The switch
  still decides whether the Settings group shows, so developers see what a
  release with the same `.env` shows.
- **The `export` gate reason:** declared in `withinFreeTier`, but no screen
  uses it yet. While off it would pass like the others.
- **App Store Connect:** release this build without in-app purchase
  products attached. The RevenueCat SDK stays linked but is never
  configured, which App Review doesn't object to.

## Alternatives considered
- **Off whenever the RevenueCat key is missing (no new flag):** one less
  setting, but a prod `.env` with a key copied in for testing would switch
  the paywall on by accident. An explicit flag says what's intended.
- **Remote switch (backend or RevenueCat offering):** could turn on without
  a release, but turning on needs a release anyway for App Review of the
  products.
- **Raise the limits very high instead of switching off:** keeps the code
  path, but leaves the ReadPanda+ row and paywall copy in Settings.
