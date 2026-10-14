# Interests Redesign: Design

## Approach
Rework `src/screens/InterestScreen.js` in place. The state (`interests` grouped by category, `isUpdated`) and `updateUserPreferences` stay. Only the rendering and the two exits change, and a cover row is added. The screen knows where it was opened from through a route param: Settings passes `{ from: 'settings' }`; onboarding passes nothing.

```
InterestScreen
 ├─ title + line                     (R1.1)
 ├─ GenreChips (flat, wrapping)      (R1.2) — every category's subgenres in one list
 ├─ FromYourPicks                    (R2)   — hidden until something is picked and covers exist
 └─ footer: primary button + "Skip for now" (onboarding) | "Save" (settings)   (R3)
```

## Files
| File | Change |
|------|--------|
| `src/screens/InterestScreen.js` | modified: flat chips, new copy, footer, `from` param; keeps the 520pt iPad column |
| `src/screens/interests/FromYourPicks.js` | new: the cover row |
| `src/screens/interests/usePickCovers.js` | new: covers for the picked subgenres (below) |
| `src/screens/profile/SettingsScreen.js` | modified: `navigate('Interest', { from: 'settings' })` |
| `src/navigation/MainStackNavigator.js` | modified: hide the native "Select Interests" header in onboarding (14a has none); keep a back button from Settings |

## Cover row (`usePickCovers`)
- Picked subgenres = every `preference_subgenre` whose `preference_value` is true, in pick order.
- For each, `fetchDiscover(subgenre)` (the same `GET /discover?genre=` Discover uses), cached per subgenre for the screen's life, so unpicking and re-picking doesn't refetch.
- Take each genre's `popular` covers and interleave them round-robin, skipping duplicates by `book_id`, up to 5.
- Debounce 300ms after the last tap. The previous covers stay until the new set arrives (R2.2). A failed fetch just drops that genre.

## Exits (R3)
- **Onboarding:** "Continue" → `updateUserPreferences` when `isUpdated`; with nothing picked it takes the Skip path. "Skip for now" → `updateUser({ isNewUser: false })` and `goBack()`, as today's no-change path does.
- **Settings:** "Save" → `updateUserPreferences` and `goBack()`; no Skip. Leaving with back discards changes, as today.

## Edge cases
- The preferences fetch hasn't landed when the screen opens (sign-up): chips render when it arrives, as today's effect does.
- A subgenre with no books: no covers from it; the row mixes the rest or hides.
- Offline: chips still work; the row stays hidden.
