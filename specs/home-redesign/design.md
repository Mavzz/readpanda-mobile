# Home Redesign (turn 16): Design

## Approach
Rebuild `src/screens/home/` around one section component per handoff section,
plus three layout shells (phone, iPad portrait, iPad landscape) that only
arrange those sections. Each section reads its data from one hook
(`useHomeSections`) and returns `null` when it has none. That makes the "hide
when empty" rule (R1.2) local to each section, and the shells never need to
check data.

```
HomeScreen
 ├─ useHomeData()        (existing: fetch / focus / refresh)
 ├─ useHomeSections()    (new: derives each section's view model from the stores)
 └─ useLayout().sizeClass
     ├─ compact → <HomePhone>      single column
     ├─ regular → <HomePortrait>   rows per 16d
     └─ wide    → <HomeLandscape>  SplitLayout 7/5
```

## Files
| File | Change |
|------|--------|
| `src/screens/home/HomeScreen.js` | modified: pick the shell by size class; first-run branch unchanged |
| `src/screens/home/useHomeSections.js` | new: view models for every section (below) |
| `src/screens/home/HomeHeader.js` | modified: part-of-day greeting, 30pt on iPad |
| `src/screens/home/ContinueHero.js` | new, replaces `ContinueReadingHero.js`: room chip, friend track, comments line, responsive CTA |
| `src/components/FriendTrack.js` | new: track + avatars with knockout ring + "+N"; also used by Room 14i |
| `src/screens/home/YourWeek.js` | new |
| `src/screens/home/RoomsTonight.js` | rewritten: scroller (phone) / stacked list (iPad); 4 card states via `RoomTonightCard`; renders the existing join-by-code row when there are no rooms |
| `src/screens/home/RoomTonightCard.js` | new: `state: 'together' \| 'notStarted' \| 'noBook' \| 'noSchedule'` |
| `src/screens/home/NewInRooms.js` | new: rows with a redacted locked state |
| `src/screens/home/UpNext.js` | new: tiles / shelf cards |
| `src/screens/home/PopularThisWeek.js` | new: reuses Discover's popular page via `useDiscoverPages` |
| `src/screens/home/layouts/HomePhone.js`, `HomePortrait.js`, `HomeLandscape.js` | new |
| `src/screens/home/HomeSkeleton.js` | modified: skeletons that match the new sections |
| `src/utils/enhancedStorage.js` | modified: per-day page counts next to `reading_days` (if approved) |
| `src/screens/home/RoomSwapCard.js` | removed (now the *Not started* card state) |
| `src/screens/home/RoomNudgeHero.js` | kept as the hero for 0 books + ≥1 room (R1.5); restyled to the new hero card |
| `src/screens/home/CuratedForYou.js` | kept, used only by first run |

## Data and state (`useHomeSections`)
| Section | Derived from |
|---|---|
| hero | `readingProgressStore.activeBook` + `progress[id]` (page, total, chapter), `memberProgress` / `remoteProgress` for the track; pace = 1.5 min/page (the same constant as `readingTime.js`) unless a measured pace exists |
| hero room chip | `roomStore.rooms` filtered to rooms reading this book; nearest `schedule.dueAt`, else the room the book was last opened in |
| comments waiting | `commentsStore.unlockedUnreadCount(bookId)` and the next unlocked thread page |
| yourWeek | `enhancedStorage` reading days (last 7) + `getReadingStreak()` + pages-per-day |
| roomsTonight | every `roomStore.rooms` entry → `{state, …}`. `noBook` = no current book; `notStarted` = the room's book has no position in `progress`; `together` = has a position and `scheduleOf(room)`; `noSchedule` = otherwise. `scheduleOf` moves from `widgetState.js` to `src/utils/roomSchedule.js` so both share it |
| newInRooms | `commentsStore.byBook[*].threads` for the books of the user's rooms, flattened, newest 3; `unlocked = page ≤ furthestPage` |
| upNext | `readingProgressStore.shelf` minus the hero, sorted by `lastReadAt` |
| popular | `useDiscoverPages(null)`, first page |

`useHomeData` gains the fetches these need (comments for each room book, the
Discover popular page). They go out in parallel with the existing ones.

## Navigation
No new routes. The targets are existing ones: Profile, the Room (`RoomLobbyScreen`), `ManuscriptScreen` (with `page` and `roomId` params for the comment taps), `BookDetail`, the Rooms and MyBooks tabs.

## Edge cases
- Solo reader: no room chip, no track, no New in your rooms; Rooms tonight is the join-by-code row; the hero shows pace copy.
- 0 books + rooms: the room nudge hero (R1.5); Up next and Your week hide naturally.
- Today every room is `noSchedule` (the API has no schedules yet), so check the order and the state logic with a mocked `schedule`.
- A book in several rooms: the chip uses the nearest deadline, and with no schedules the room last opened in.
- Locked comments: their body must not appear in the accessibility label either. Read out "Locked comment at page {p}".
- Today not read yet versus already read: the footer copy and the today ring change once a page has been read today.
- The streak broke yesterday: the dots show missed days, with no shaming copy.
- Offline: sections render from the persisted stores, and Popular hides if it has never loaded.

## Alternatives considered
- **Keeping one layout and stretching it on iPad.** Rejected by the handoff (16c/16d).
- **Fetching a single aggregated `/home` endpoint.** Rejected: "no new backend features".
