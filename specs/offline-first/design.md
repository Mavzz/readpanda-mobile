# Offline first: Design

## Approach
Four pieces, built in this order so each one stands on the last.

**1. Connectivity (R1, R2).** `@react-native-community/netinfo` feeds a small
zustand store, `connectivityStore`, with `online`, `wifi` and `expensive`
(Low Data Mode or cellular). `online` is `isConnected !== false`: no network
at all. NetInfo's Google reachability check is turned off, because it was slow
to recover and never passes where Google is blocked. A refused request and a
return to the foreground both call `NetInfo.refresh()` (at most every 3s), so a
missed reconnect corrects itself. A recheck only ever clears "offline". And
since NetInfo can stay wrong (the Simulator does), while offline one GET every
5s goes out as a probe, and any HTTP answer to any request marks the app
online (`confirmOnline`). The reverse too: two requests in a row with no answer
on a connected network (a dead Wi-Fi, 100% loss) mark it offline
(`reportNoAnswer`, R1.6). `apiService.executeRequest` reads the store: offline,
it throws an `OfflineError` (`error.offline = true`) before calling `fetch`.
Online, every `fetch` gets an `AbortController` with a 15s timeout, and an
abort counts as a network error, so the existing backoff applies. A
non-GET rejected offline with no `quiet` option shows the R1.5 toast once
(debounced to one toast every 3s). GETs stay silent because screens fall
back to their cache. Outbox sends pass `quiet: true`.

The `OfflinePill` is mounted in `AppNavigator`'s `AppContent` while signed
in, inside a `FullWindowOverlay` on iOS so native modals can't cover it,
93pt from the bottom (8pt above the phone's 85pt tab bar) with
`pointerEvents="none"`. While offline, `showToast` raises toasts from
100pt to 132pt so they stack above it. It's a glass
pill in `DS.colors.surfaceContainerGlass` (no blur library is installed, so
it uses the same no-blur fallback as the tab bar) holding a cloud-offline
icon and
"Offline", or "Syncing…" while the outbox is flushing (R2.2). It fades with
the motion presets. `AccessibilityInfo.announceForAccessibility` runs on
each change (R2.4).

**2. Outbox (R3).** A new store, `outboxStore`, persisted with `persistSlice`
as `outbox` (so it's per account and hydrated with the other caches). Items
look like this:

```js
{ id, kind, bookId, roomId, ref, parentRef, payload, createdAt }
// kind: 'progress' | 'highlight.add' | 'highlight.remove' | 'comment.add'
//     | 'comment.like' | 'comment.read' | 'comment.delete' | 'notification.read'
// ref: the clientId or server id the item is about; parentRef: a reply's parent
```

The stores stay in charge of what the reader sees. They try the request as
they do today. On a network failure (`isNetworkError(e)`: offline, timeout,
or `TypeError: Network request failed`) they `enqueue` instead of rolling
back, and the optimistic row stays with `queued: true`. Progress, likes
and comment reads are the exception: they always go through `enqueue` and
then `flush`. Progress is fire-and-forget anyway; for likes and reads it keeps
an offline write from being sent after a newer online one.

`enqueue` applies the R3.4 collapse rules against the items already queued.
`flush` runs on reconnect (`connectivityStore` subscription), on
`AppState` → active, and after `hydrateCaches`. Only the reconnect flush
(`catchUp()`) sets `catchingUp`, which the pill shows as "Syncing…". It's a single-flight loop:
it takes the head item, resolves its `ref` through a `clientId → serverId`
map that accepted `comment.add` items fill (R3.5), and sends it through a
per-kind handler. The handlers live in the store that owns the data. A
store registers `{ send, onAccepted, onRejected }` for its kinds, so the
outbox never imports a store and the import graph stays acyclic.
- **Accepted:** remove it and call `onAccepted`, which swaps in the server
  row and clears `queued`.
- **4xx:** remove it and call `onRejected`, which runs the R3.6 rollback. A
  404 on `comment.delete` or `highlight.remove` counts as accepted.
- **Network or 5xx:** stop the loop and leave the item at the head (R3.7).

A `comment.add` whose parent is still queued waits behind it, since sends
go in order and the map fills before the reply is reached.

**3. Caches (R4, R5).** More `persistSlice` calls, registered in
`authStore.hydrateCaches`:
- `comments`: `byBook` with `loading` stripped, capped at the 30 most
  recently `loadedAt` books in `pick`
- `highlights`: `byBook`, the same 30-book cap
- `memberProgress`: `readingProgressStore.remoteProgress`
- `notifications`: `notifications` and `unreadCount`
- `curatedBooks`: a new `bucketsStore.curatedBooks` map,
  `{ [bucketId]: page }`, filled by `fetchCuratedBucketBooks`. On failure it
  returns `{ status: 200, response: cached, cached: true }`, so
  CuratedBucketScreen and BookGridScreen need no new branch to show stale
  data.

The room lobby already reads from the persisted `rooms` list, which
`fetchRoomDetail` merges detail into, so R5.1 only needs `remoteProgress`
persisted and the lobby's offline state.

`loadComments` currently replaces `threads` with the server's. It now
merges back every comment still `queued`, the way `loadHighlights` already
keeps `pending` (R3.10). A new hook, `useOnReconnect(callback)`, calls back
when `online` flips to true while the screen is focused (R5.6).

**4. Native: prefetch and the reader's offline state (R6, R7).** Download
moves from `Data(contentsOf:)` to `URLSession.shared.dataTask`, so failures
arrive as `URLError`, and the reader can tell offline
(`.notConnectedToInternet`, `.networkConnectionLost`, `.dataNotAllowed`,
`.cannotFindHost`, `.timedOut`) from everything else. `StatusView` gets an
`.offline` state with the R7.1 copy. In that state an `NWPathMonitor` waits
for `.satisfied` and calls `reload()` (R7.2), then stops. Other failures
show "Couldn't open this book" (R7.3). The underlying message still goes to
`onError` for logging and Sentry.

`ManuscriptCache` gets a small bridge module, `ManuscriptStore`, with
`isCached(url)` and `prefetch(url)`, both promises, that reuses
`file(for:)`, `write` and `prune`. `useShelfPrefetch` runs on foreground
when `wifi && !expensive`: it calls `fetchMyProgress` for fresh presigned
URLs, takes the 10 most recent, skips the cached ones and prefetches the
rest one at a time. It checks `connectivityStore` between books (R6.1–R6.3).
NetInfo can't see Low Data Mode on iOS, so `prefetch` builds its request
with `allowsConstrainedNetworkAccess = false` and
`allowsExpensiveNetworkAccess = false`, and the system refuses it in Low
Data Mode or on cellular even if the JS check is stale (R6.2).

The same run then loads the buckets (R6.5, R6.6), added after the device
review. It takes the bucket lists the store already has (fetching them
first only when both are empty), and calls `fetchCuratedBucketBooks` and
`fetchBucketBooks` for each, which fill the `curatedBooks` and
`bucketBooks` caches from R5.2. The covers of those pages, hero images
included, go through `Image.prefetch`, which fills the same iOS URL cache
`BookCoverGradient` reads with `force-cache` offline. Buckets go before the
books: they're a few small requests, and a PDF batch can run long.

**5. Progress ordering, API (R9).** `saveProgress` stamps the outbox item
with `readAt: Date.now()`, and collapsing keeps the newest item and its
time. `putReadingProgress` sends `read_at` as an ISO 8601 string. In
`PutMyProgress` (readpanda `internal/handlers/progress.go`) the
request gains an optional `ReadAt string`. A pure helper,
`effectiveReadAt(raw string, now time.Time) time.Time`, parses it, clamps it
to `now`, and falls back to `now` when it's missing or unparseable (R9.5). The upsert's `DO UPDATE` becomes conditional per
column:

```sql
current_page = CASE WHEN EXCLUDED.last_read_at >= reading_progress.last_read_at
                    THEN EXCLUDED.current_page ELSE reading_progress.current_page END,
-- total_pages: the same guard, around today's zero-guard CASE
furthest_page = GREATEST(reading_progress.furthest_page, EXCLUDED.current_page),
last_read_at  = GREATEST(reading_progress.last_read_at, EXCLUDED.last_read_at),
updated_at    = EXCLUDED.updated_at
```

`$5` splits into `readAt` for `last_read_at` and `now` for `updated_at`.
The `newly_unlocked` count works unchanged, because it keys off
`furthest_page` (R9.4). No migration is needed: `last_read_at` already
exists. ROUTES.md documents `read_at`. The handlers' tests are pure-function
tests with no database, so `effectiveReadAt` gets a table test in
`helpers_test.go`, and the conditional upsert is checked against the dev
database during acceptance.

**6. Layout fixes (R10, R11).** `BookCoverGradient` keeps its
`LinearGradient` childless, matching the rule CuratedBucketScreen already
documents for the Fabric interop. The title moves into a sibling `View`,
placed at 0,0 with the cover's explicit `width` and `height`, padding 10
and `justifyContent: 'flex-end'`. A plain View lays out normally, so the
title sits bottom-aligned and is clipped only by `numberOfLines={3}`
(R10.1, R10.2). The title gets `maxFontSizeMultiplier={1.3}` (R10.3). The
noisy `log.debug` on every render goes too.

CuratedBucketScreen moves to Reanimated's `Animated.FlatList` with
`useAnimatedScrollHandler`. A `TopBar` view is absolutely positioned above
the list: height `insets.top + 66`, `surfaceContainerGlass`, the bucket
name in `DS.type` title style, left-padded to clear the back button. Its
opacity interpolates from 0 to 1 across the last 60pt of the hero
(`HERO_HEIGHT - insets.top - 66` on phone, `HERO_HEIGHT_LARGE` on iPad)
(R11.1, R11.2, R11.4). The back button renders after it, so it sits on the
bar. With the bar in place, its own 55% backdrop is enough (R11.3).

**Covers (R8).** `BookCoverGradient` keeps `failed` state from `Image`
`onError` and renders the duotone branch when it's set (R8.1). Offline, the
source gets `cache: 'force-cache'` (iOS), so NSURLCache serves an expired
copy rather than failing (R8.2).

**8. A refresh token per device (R12).** `refresh_tokens` already has a row
id, so no migration: `storeRefreshToken` stops overwriting the account's one
row. Every sign-in inserts its own row, after deleting the reader's expired
ones. The refresh handler's `SELECT COUNT(*)` check and its
`storeRefreshToken` call become one `UPDATE refresh_tokens SET token = $new,
expires_at = … WHERE user_id = $1 AND token = $old AND expires_at > NOW()`.
No row updated means the token was used or expired: 401, as before. Sign-out
already deletes by token, and suspension by user, so both are unchanged.

## Files
| File | Change |
|------|--------|
| `package.json`, `ios/Podfile.lock` | modified: add `@react-native-community/netinfo` (exact version), `yarn pods` |
| `src/stores/connectivityStore.js` | new: NetInfo subscription; `online`, `wifi`, `expensive`; `isOnline()`; `startConnectivity()` called from `index.js` |
| `jest.setup.js` | modified: NetInfo's bundled jest mock |
| `src/services/apiService.js` | modified: offline short-circuit, 15s `AbortController` timeout, `quiet` option, R1.5 toast |
| `src/utils/apiError.js` | modified: `OfflineError`, `isNetworkError(e)` |
| `src/services/authenticatedRequests.js` | modified: GET and PUT take `options` (for `quiet`) |
| `src/components/Toaster.js` | modified: `showOfflineToast()`; error toasts dropped while it's up; toasts raised above the pill while offline |
| `src/stores/outboxStore.js` | new: items, `enqueue` with collapse rules, single-flight `flush`, handler registry, id map |
| `src/hooks/useOutboxTriggers.js` | new: flush on reconnect and on AppState active; mounted in `AppNavigator` |
| `src/stores/commentsStore.js` | modified: network failure → enqueue for add, like, read, delete; `queued` flag; merge on load (queued kept, offline deletes left out); register handlers; persist |
| `src/services/commentsService.js`, `src/services/safetyService.js` | modified: `createComment` and `deleteComment` take `options` (for `quiet`) |
| `src/stores/highlightsStore.js` | modified: enqueue add and remove; handlers; loads skip queued removals; persist with `seenAt` |
| `src/services/highlightsService.js` | modified: create and delete take `options` (for `quiet`) |
| `src/stores/readingProgressStore.js` | modified: progress through the outbox; reload comments on accept (R4.4); persist `remoteProgress` |
| `src/stores/notificationStore.js` | modified: enqueue `markAsRead`; persist list and count |
| `src/stores/bucketsStore.js` | modified: `curatedBooks` and `bucketBooks` caches, with cached fallbacks in `fetchCuratedBucketBooks` and `fetchBucketBooks` |
| `src/stores/authStore.js` | modified: hydrate the new slices, then flush |
| `src/screens/profile/SettingsScreen.js` | modified: confirm before signing out with unsent items (R3.8) |
| `src/components/OfflinePill.js` | new: the pill (R2) |
| `App.js` | modified: root `SafeAreaProvider` (the pill renders outside the navigators) |
| `src/navigation/AppNavigator.js` | modified: mount `OfflinePill`, `useOutboxTriggers`, `useShelfPrefetch` |
| `src/hooks/useOnReconnect.js` | new: refetch when back online while focused |
| `src/hooks/useShelfPrefetch.js` | new: Wi-Fi prefetch of shelf books, bucket pages and covers (R6) |
| `ios/ReadPanda/AppDelegate.swift` | modified: a 200 MB shared `URLCache`, so prefetched covers stay (R6.6) |
| `src/screens/roomLobby/RoomLobbyScreen.js`, `useRoomLobby.js` | modified: offline state; `useOnReconnect` |
| `src/screens/BookGridScreen.js`, `src/screens/CuratedBucketScreen.js`, `src/screens/MyBucketScreen.js` | modified: offline state; `useOnReconnect` |
| `src/components/NotificationList.js` | modified: offline state when empty and offline |
| `src/components/PdfViewer.js` | modified: pass `queued` through with each comment; raise the Offline pill while the comment sheet is open |
| `ios/CommentSheetView.swift` | modified: "Will send when you're back online" for queued comments (R3.9); reports open/close (`onVisibilityChange`) |
| `ios/RNPdfViewer.swift`, `ios/RNPdfViewer.m` | modified: URLSession download, `.offline` status, NWPathMonitor reload, `ManuscriptStore` bridge |
| `src/components/BookCoverGradient.js` | modified: `onError` fallback, `force-cache` offline; title in a sibling View, `maxFontSizeMultiplier` (R10) |
| `src/services/progressService.js` | modified: send `read_at`; `quiet` option |
| `src/screens/ManuscriptScreen.js` | modified: the mid-read unlock PUT skips offline and is `quiet` |
| `src/screens/CuratedBucketScreen.js` | modified: also `Animated.FlatList` and the fading top bar (R11) |
| readpanda `packages/api-go/internal/handlers/progress.go` | modified: optional `read_at`, conditional upsert (R9.3–R9.5) |
| readpanda `packages/api-go/internal/handlers/helpers_test.go` | modified: `effectiveReadAt` table test (missing, bad, past, future) |
| readpanda `packages/api-go/internal/server/progress_test.go` | modified: `TestPutProgressLateSave` against a real database |
| readpanda `packages/api-go/internal/handlers/users.go` | modified: a refresh token row per sign-in; refresh replaces only its own (R12) |
| readpanda `packages/api-go/internal/server/auth_test.go` | modified: two devices' sign-ins survive each other (R12) |
| readpanda `packages/api-go/ROUTES.md` | modified: document `read_at` on `PUT /progress/{bookId}` |
| `src/stores/__tests__/outboxStore.test.js` | new: collapse rules, ordering, id resolution, 4xx and 5xx paths |

## Data and state
- **New persisted keys** (MMKV, scoped per account through
  `enhancedStorage.writeCache`): `cache_outbox`, `cache_comments`,
  `cache_highlights`, `cache_memberProgress`, `cache_notifications`,
  `cache_curatedBooks`.
- **New native cache use:** the existing `Caches/manuscripts` directory. No
  new keys.
- **API change:** `PUT /progress/{bookId}` takes an optional `read_at` (ISO
  8601). It's backwards compatible: without it, behaviour is unchanged, so
  the API can deploy first.
- **Endpoints:** none new. Outbox sends use the existing services:
  - `PUT /progress/{bookId}`
  - `POST /books/{bookId}/highlights` and `DELETE /highlights/{id}`
  - `POST /room/{id}/book/{bookId}/comments` and `.../comments/read`
  - `POST` and `DELETE /comments/{id}/like`
  - `DELETE /comments/{id}`
  - `PUT /notifications/{id}/read`
  - `GET /progress` for prefetch
- **Store flags:** `queued: true` on comments and highlights waiting in the
  outbox. Highlights' existing `pending` stays for "request in flight".

## Navigation
None.

## Edge cases
- **Signed out mid-flush:** `flush` checks the account before each item. The
  outbox is scoped, so the next account never sees it.
- **Same item sent twice** (app killed after the server accepted, before it
  was removed): the server's `client_id` dedupe and idempotent endpoints
  make the replay harmless.
- **Reply to a comment that's rejected:** the queued reply is rejected with
  it and flips to failed, so nothing is sent with a dangling parent.
- **Reading past `furthest_page` offline:** comments on those pages stay
  locked until the progress item is accepted (R4.4). The server owns that
  line and the client never guesses it.
- **NetInfo says online but there's no internet** (captive portal): requests
  time out after 15s and count as network errors, so outbox items stay
  queued. The pill doesn't show, which is acceptable for a rare case.
- **Cache size:** comments for 30 books is bounded by the API's thread
  payload. If MMKV writes show up in profiling, `pick` can keep only the
  thread heads.
- **Prefetch evicting the cache:** `prune` drops the least recently opened
  books past 500 MB, and prefetched books count as just opened. Ten shelf
  books are usually well under 500 MB. If a large shelf does fill it, the
  books dropped are the ones not opened recently, never the ones just
  prefetched.
- **Phone clock wrong:** a clock set ahead is clamped to the server's `now`
  (R9.5). A clock set behind makes that phone's writes look old, so they
  lose to another device. They still raise `furthest_page`, and the
  phone's own reader is unaffected.
- **Old app versions** send no `read_at` and keep today's last-write-wins.
- **Cover image and placeholder at once:** the title View exists only in
  the gradient branch, so a real cover never gets a stray title.
- **Expired presigned URL in a stored position:** prefetch always asks
  `GET /progress` for fresh URLs, and the cache key ignores the query string.
- **Empty state:** each screen's offline state appears only with nothing
  cached (R5.5).

## Alternatives considered
- **Infer offline from failed fetches, no NetInfo.** That saves a native
  dependency, but Wi-Fi vs cellular (R6.2) and a prompt reconnect signal
  (R5.6, R7.2) would be guesses.
- **TanStack Query with its persister.** It would cover caching and
  retries, but the stores already own optimistic state. Moving every screen
  to it is a rewrite, not this feature.
- **Outbox inside each store.** Ordering across kinds (a reply after its
  parent, a like after the comment) needs one queue.
- **An explicit Download button.** Ruled out during the spec interview in
  favour of automatic prefetch.
