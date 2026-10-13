# Interests Redesign (14a): Requirements

Status: Draft <!-- Draft → Approved -->
Design handoff: `ReadPanda Design Review.dc.html` § 14a, "the phone interests screen (InterestScreen, the only onboarding screen)". On iPad it's centred in a 520pt column (already built in `specs/ipad-support/` task 7).

## Goal
Today's Interest screen ("What's your flavour?") is a wall of chips grouped by category with a "Done!" button, and nothing on it shows why the picks matter. The redesign is one calm screen: a single list of genre chips, a cover row that shows what your picks lead to, and a clear way to continue or skip. Phone and iPad get the same content.

## Out of scope
- More onboarding steps. 14a says this is the only onboarding screen, with no step counter.
- Changing how preferences are stored or sent (`PreferenceService` stays as is).

## Requirements

### R1. Content
1. THE screen SHALL show the title "What do you like to read?" and the line "Pick a few. Discover starts here, and you can change it any time in Profile."
2. THE genre chips SHALL be one flat, wrapping list (no category headings). A picked chip SHALL show the gradient fill and a check.
3. THE screen SHALL have no step counter or progress bar.

### R2. "From your picks" cover row
1. WHEN at least one genre is picked THE screen SHALL show a "From your picks" row of up to 5 covers drawn from the picked genres' popular books, mixed so each genre is represented.
2. WHEN the picks change THE row SHALL update without a full-screen reload (old covers stay until the new ones arrive).
3. WHEN nothing is picked, or no covers come back, THE row SHALL be hidden (not shown empty).

### R3. Continue and Skip
1. "Continue" SHALL save the picks (as "Done!" does today) and finish onboarding. WHEN nothing is picked THE button SHALL act as "Skip for now".
2. "Skip for now" SHALL finish onboarding without saving picks (as "Done!" with no changes does today).
3. WHEN opened from Settings → Genres I like THE button SHALL read "Save", "Skip for now" SHALL be hidden, and saving SHALL return to Settings.

### R4. Layout
1. Phone: one column with the page gutter. iPad: centred at 520pt in both orientations (done).

## Open questions
- [x] **Chip labels:** they match. `discoverGenres` (api-go `handlers/discover.go`) builds Discover's genres from `books.subgenre`, with `value` = `label` = the subgenre, and the reader's liked subgenres first. So each picked chip's `preference_subgenre` is fetched with `GET /discover?genre={subgenre}` for its covers. A subgenre with no books returns none, and the row just mixes the rest.
- [x] **Continue with nothing picked:** acts as Skip.
- [x] **From Settings:** "Save" instead of "Continue", and "Skip for now" hidden.
