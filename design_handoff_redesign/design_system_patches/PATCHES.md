# Design-system patches — apply to readpanda-mobile@master

Exact find → replace edits, grouped by file. Everything references tokens
already exported from `src/styles/global.js`. Order doesn't matter.

---

## 1. Off-palette colors (light-mode leftovers)

### src/components/PdfViewer.js
Add the import:
```js
import { DS } from '../styles/global';
```
Spinner (line ~95):
```diff
- <ActivityIndicator size="large" color="#4A90D9" />
+ <ActivityIndicator size="large" color={DS.colors.primary} />
```
Then replace the whole `styles` block with:
```js
const styles = StyleSheet.create({
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DS.colors.background + 'D9', // surface @ 85% — was light-mode white
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: DS.colors.onSurfaceVariant,
  },
  centeredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: DS.colors.error,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  retryButton: {
    backgroundColor: DS.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: DS.radius.full,
  },
  retryText: {
    color: DS.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  pageIndicator: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: DS.colors.surfaceContainerGlass, // glass rule
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: DS.radius.full,
  },
  pageText: {
    color: DS.colors.onSurface,
    fontSize: 13,
    fontWeight: '500',
  },
});
```

### src/components/Toaster.js
Replace the entire file with `handoff/src/components/Toaster.js` (included in
this package). The old green/red/purple toasts (#4BB543, #FF3333, #667eea) were
from a different palette entirely.

### src/screens/ManuscriptScreen.js
```diff
  platformMessage: {
    fontSize: 18,
-   color: '#555',
+   color: DS.colors.onSurfaceVariant,
```

### Empty-state icons — three screens, same one-liner
`src/screens/CurrentReadScreen.js`, `src/screens/JoinRoomScreen.js`,
`src/screens/MyRoomsScreen.js`:
```diff
- <Icon name="..." size={64} color="#ccc" />
+ <Icon name="..." size={64} color={DS.colors.onSurfaceVariant} />
```

---

## 2. The "No-Line" rule (borders → tonal / ghost)

### src/screens/HomeScreen.js — createBucketCard (~line 298)
Dashed 1px border → ghost border (outline-variant @ 15%), and radius up to md
(DESIGN.md: never below 1.5rem):
```diff
  createBucketCard: {
    ...
-   borderRadius: DS.radius.sm,
-   borderWidth: 1,
-   borderColor: DS.colors.outlineVariant,
+   borderRadius: DS.radius.md,
+   borderWidth: 1,
+   borderColor: DS.colors.outlineVariant + '26', // ghost border @ 15%
    borderStyle: 'dashed',
```

### src/screens/CreateBucketScreen.js — input (~line 178)
Sunken field per DESIGN.md (no stroke, surface-container-lowest, md rounding):
```diff
  input: {
-   backgroundColor: DS.colors.surfaceContainerHigh,
-   borderRadius: DS.radius.sm,
+   backgroundColor: DS.colors.surfaceContainerLowest,
+   borderRadius: DS.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: DS.colors.onSurface,
-   borderWidth: 1,
-   borderColor: DS.colors.outlineVariant,
  },
```
Selected-book state (~line 218) — soften the hard 2px stroke:
```diff
  bookItemSelected: {
    opacity: 0.85,
    borderWidth: 2,
-   borderColor: DS.colors.primary,
-   borderRadius: DS.radius.sm,
+   borderColor: DS.colors.primary + '66', // glow-style @ 40%; checkmark badge carries the meaning
+   borderRadius: DS.radius.md,
  },
```
Save button — buttons are rounded-full:
```diff
  saveButton: {
    backgroundColor: DS.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
-   borderRadius: DS.radius.sm,
+   borderRadius: DS.radius.full,
  },
```
Also `bookItem`: `borderRadius: DS.radius.sm` → `DS.radius.md`.

**Keep as-is:** Badge.js and ProfilePicture.js borders are knockout rings in
surface colors (masks against the background, not dividers) — they comply.

---

## 3. Manrope (the system font, never loaded)

1. Download Manrope (variable or static 400/500/600/700/800) from Google Fonts
   into `src/assets/fonts/`.
2. Add `react-native.config.js` from this package to the repo root, then run:
   `npx react-native-asset` (re-run pods for iOS).
3. In `src/styles/global.js`, replace the `fonts` block of `MyTheme`:
```js
fonts: {
  regular: { fontFamily: 'Manrope-Regular', fontWeight: '400' },
  medium: { fontFamily: 'Manrope-Medium', fontWeight: '500' },
  bold: { fontFamily: 'Manrope-SemiBold', fontWeight: '600' },
  heavy: { fontFamily: 'Manrope-Bold', fontWeight: '700' },
},
```
4. Add to `DS` in global.js so screens can reference it:
```js
font: {
  regular: 'Manrope-Regular',
  medium: 'Manrope-Medium',
  semibold: 'Manrope-SemiBold',
  bold: 'Manrope-Bold',
},
```
   Then add `fontFamily: DS.font.bold` (etc.) to the text styles in
   `loginStyles`, `cardStyles`, `screenStyles` — RN doesn't cascade
   font-family, so each Text style needs it. Note: with static font files,
   keep `fontWeight` OUT of the style on Android (the family name carries
   the weight).

---

## 4. Navigation crash (from the review)

`src/screens/HomeScreen.js` (~line 88): `navigation.navigate('Interest')` —
verify a route named `Interest` is registered in the navigator that renders
Home (the review found Profile → 'InterestScreen' unregistered; same check
applies here for new users).
