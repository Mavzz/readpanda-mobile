# Offline first: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes.

- [x] 1. API: `read_at` on `PUT /progress/{bookId}` (R9.3, R9.4, R9.5)
  - readpanda `internal/handlers/progress.go`: `effectiveReadAt`, the
    conditional upsert, `last_read_at` from `readAt` and `updated_at` from
    `now`
  - `helpers_test.go` table test; ROUTES.md
  - separate readpanda PR; backwards compatible, so it can deploy first
- [x] 2. Connectivity store (R1.1)
  - add `@react-native-community/netinfo` at an exact version, `yarn pods`
  - `src/stores/connectivityStore.js`: `online`, `wifi`, `expensive`; unknown
    counts as online
- [x] 3. API client fails fast offline and times out (R1.2, R1.3, R1.4, R1.5)
  - `OfflineError` and `isNetworkError` in `src/utils/apiError.js`
  - `apiService.executeRequest`: offline short-circuit, 15s `AbortController`,
    `quiet` option, debounced "You're offline" toast for non-GETs
  - unit tests for the short-circuit, the timeout and the toast
- [x] 4. Offline pill (R2.1, R2.3, R2.4)
  - `src/components/OfflinePill.js`, mounted in `AppNavigator` beside
    `Toaster`. Glass, `DS` tokens, `pointerEvents="none"`, motion preset
    fade, VoiceOver announcements. "Syncing…" waits for task 6.
- [x] 5. Outbox store (R3.2, R3.3, R3.4, R3.5, R3.6, R3.7)
  - `src/stores/outboxStore.js`: items, `enqueue` with the collapse rules,
    single-flight `flush`, handler registry, `clientId → serverId` map;
    persisted as `outbox`
  - `src/stores/__tests__/outboxStore.test.js`: each collapse rule, ordering,
    id resolution, 4xx removes, 404-as-done, network and 5xx stop the loop
- [x] 6. Outbox triggers and the Syncing pill (R3.3, R2.2)
  - `src/hooks/useOutboxTriggers.js`: flush on reconnect and AppState
    active; `authStore.hydrateCaches` flushes after hydrating
  - `OfflinePill` shows "Syncing…" while `flush` runs with items
- [x] 7. Reading progress through the outbox (R3.1, R3.4, R4.4, R9.1, R9.2)
  - `readingProgressStore.saveProgress` → `enqueue('progress', { readAt })` +
    `flush`; collapse keeps the newest item's `readAt`
  - `progressService.putReadingProgress` sends `read_at`
  - on accept, reload that book's comments
- [x] 8. Highlights offline (R3.1, R3.4, R3.6, R3.10, R4.1, R4.2)
  - network failure → enqueue add or remove with `queued: true`, no rollback
  - handlers: accept swaps in the server row; 4xx removes it with the R3.6
    toast; 404 on remove is done
  - persist `byBook` (30 most recent books); hydrate it
- [x] 9. Comments offline: post, reply, delete (R3.1, R3.4, R3.5, R3.6, R3.10, R4.1, R4.2)
  - `addComment` and `retryComment`: network failure → enqueue, `queued: true`
  - `deleteComment` of a queued comment drops both halves; otherwise
    enqueue on network failure
  - `loadComments` merges queued comments back in
  - persist `byBook` (30 most recent books); hydrate it
- [x] 10. Comments offline: likes and reads (R3.1, R3.4, R3.5, R3.6)
  - `toggleLike` and `markThreadRead` enqueue on network failure; likes
    collapse per comment, reads merge per book; 4xx puts the state back
- [x] 11. Queued label in the comment sheet (R3.9)
  - pass `queued` through `src/components/PdfViewer.js`
  - `ios/CommentSheetView.swift`: "Will send when you're back online" in
    place of the spinner
  - give a queued comment the ⋯ menu with Delete only (`menuButton()` hides
    it for `pending` today); the store already handles deleting one (task 9)
- [x] 12. Notifications offline (R3.1, R5.3)
  - `markAsRead` enqueues on network failure (check that
    `NotificationService.markAsRead` rethrows rather than swallowing)
  - persist `notifications` and `unreadCount`
- [x] 13. Sign-out guard (R3.8)
  - `SettingsScreen`: confirm with the unsent count before `signOut`
- [x] 14. Member progress cache (R4.3, R5.1)
  - persist `readingProgressStore.remoteProgress`; hydrate it
- [x] 15. Reconnect hook and screen offline states (R5.1, R5.2, R5.4, R5.5, R5.6)
  - `src/hooks/useOnReconnect.js`
  - `bucketsStore.curatedBooks` cache and cached fallback in
    `fetchCuratedBucketBooks`
  - RoomLobbyScreen, BookGridScreen, CuratedBucketScreen and
    NotificationList: keep cached data on a failed refresh, offline copy when
    empty, refetch on reconnect
- [x] 16. Reader offline state (R7.1, R7.2, R7.3)
  - `ios/RNPdfViewer.swift`: URLSession download, `URLError` → `.offline`
    status with the R7.1 copy, NWPathMonitor reload, "Couldn't open this
    book" for the rest
- [x] 17. Shelf prefetch (R6.1, R6.2, R6.3, R6.4)
  - `ManuscriptStore` bridge (`isCached`, `prefetch`) in `RNPdfViewer.swift`
    and `.m`
  - `src/hooks/useShelfPrefetch.js`, mounted in `AppNavigator`; cap 10
  - the prefetch request sets `allowsConstrainedNetworkAccess = false` and
    `allowsExpensiveNetworkAccess = false`, so iOS itself refuses it in Low
    Data Mode and on cellular (NetInfo can't see Low Data Mode)
- [x] 18. Cover fallback (R8.1, R8.2)
  - `BookCoverGradient`: `onError` → duotone; `cache: 'force-cache'` while
    offline
- [x] 19. Placeholder titles fit (R10.1, R10.2, R10.3)
  - `BookCoverGradient`: childless `LinearGradient`, title in a sibling View
    at the cover's size, `maxFontSizeMultiplier={1.3}`; drop the per-render
    `log.debug`
- [x] 20. Curated bucket top bar (R11.1, R11.2, R11.3, R11.4)
  - `CuratedBucketScreen`: `Animated.FlatList` + `useAnimatedScrollHandler`;
    a `surfaceContainerGlass` top bar with the bucket name fading in across
    the hero's last 60pt; back button above it; phone and iPad
- [x] 21. API: a refresh token per device (R12.1, R12.2, R12.3, R12.4, R12.5)
  - readpanda `internal/handlers/users.go`: `storeRefreshToken` inserts a row
    per sign-in and deletes the reader's expired ones; the refresh handler
    replaces only the token it was given, in one `UPDATE … WHERE token = $old`
    (none updated: 401)
  - `internal/server/auth_test.go`: two sign-ins survive each other's
    refreshes; signing out one leaves the other; a used token is refused
  - on the `feat/progress-read-at` branch, with task 1
- [x] 22. Your own buckets offline (R5.2, R5.4, R5.5, R5.6): `bucketBooks` cache in bucketsStore with the same cached fallback as curated buckets; MyBucketScreen gets the offline state and `useOnReconnect`. Found in acceptance: My Bucket was left out of R5.
- [x] 23. Buckets and covers on Wi-Fi (R6.5, R6.6): the Wi-Fi prefetch also loads every curated and own bucket page and prefetches their covers, capped at 200. Asked for in acceptance.

## Acceptance
<!-- Checked one requirement at a time once every task is done, before the
commit. One line per criterion: "- [x] R1.1 <short> — how it was checked".
A partial or waived one stays unticked with the reason. -->
- [x] R1.1 Online state updates within 2s — device: pill shows and clears within 2s of toggling the network
- [x] R1.2 Offline requests reject at once, no retries — apiService tests (OfflineError, no fetch)
- [x] R1.3 15s request timeout — apiService tests (TimeoutError, not retried)
- [x] R1.4 Online retries unchanged — apiService tests (5xx and dropped connection retried)
- [x] R1.5 Online-only writes fail fast with the offline toast — Toaster and apiService tests; device: server stopped, toast at once
- [x] R1.6 Two unanswered requests in a row on a connected network count as offline — connectivityStore tests; device: server stopped, pill after second load, gone within 10s of restart
- [x] R2.1 Offline pill on every signed-in screen, reader included — OfflinePill tests; device: shown on every screen
- [x] R2.2 "Syncing…" while the outbox flushes — OfflinePill tests; device: shown on reconnect with queued writes, which went through
- [x] R2.3 Pill fades when online and the outbox is empty — OfflinePill tests; device: gone once synced
- [x] R2.4 VoiceOver announces offline and back online — OfflinePill tests; device: VoiceOver announced offline and back online
- [x] R3.1 All eight writes are kept offline and stay on screen — device: all eight writes kept offline and shown as made
- [x] R3.2 Outbox survives kill and restart, per account — device: queue survived a kill and relaunch offline
- [x] R3.3 Sent in order on reconnect, foreground and launch — outboxStore tests; device: sent in order on reconnect
- [x] R3.4 Collapse rules — outboxStore tests; device: highlight added then removed never reached the server
- [x] R3.5 Dependent items wait for their comment's server id — outboxStore tests; device: reply and like on a queued comment arrived on the server
- [x] R3.6 4xx removes the item and undoes it; 404 delete is done — commentsStore/highlightsStore tests; device: blocked word flipped to failed with Edit/Discard and stayed after the reconnect's reload
- [x] R3.7 Network error or 5xx keeps the item and stops the loop — outboxStore tests (network error and 5xx stop the flush, item kept)
- [x] R3.8 Sign-out asks when items are unsent — device: sign-out asked about the unsynced change
- [x] R3.9 Queued comment label — device: queued comment shows the label
- [x] R3.10 Reloads keep queued comments and highlights — commentsStore tests; device: queued comment kept through a reload
- [x] R4.1 Comments and highlights from the device on open — device: comments and highlights shown at once with the server stopped
- [x] R4.2 30-book cap — commentsStore/highlightsStore tests (30 most recent books kept, plus any with queued items)
- [x] R4.3 Pace track shows cached member progress — device: pace track showed member progress offline
- [x] R4.4 Comments reload after queued progress is accepted — readingProgressStore tests; device: comment unlocked after the queued progress synced
- [x] R5.1 Room lobby cached — device: room lobby shown offline
- [x] R5.2 Curated, own-bucket and "See all" grids cached — bucketsStore tests; device: curated bucket, own bucket and See all grid shown offline
- [x] R5.3 Notifications cached — notificationStore tests; device: list and unread count shown offline
- [x] R5.4 Cached data kept on a failed refresh — device: pull to refresh offline kept the content, no error state
- [x] R5.5 Offline state when nothing is cached — device: never-opened screen showed the offline message
- [x] R5.6 Refetch on reconnect — useOnReconnect tests; device: screen reloaded on its own when the server came back
- [x] R6.1 Wi-Fi prefetch on foreground — useShelfPrefetch tests (with the API's nested shape); device: Shelf prefetch logged the shelf on Wi-Fi, Currently Reading books opened offline
- [x] R6.2 No prefetch on cellular, Low Data Mode or offline — useShelfPrefetch tests (no run off Wi-Fi, expensive or offline) and the native request refusing constrained and expensive networks; not tried on cellular, accepted by the user
- [x] R6.3 At most 10 books, one at a time, stops off Wi-Fi — useShelfPrefetch tests (10 at most, one at a time, stops when Wi-Fi drops); device: shelf books downloaded
- [x] R6.4 Prefetched book opens offline — device: every book on My Books, once downloaded, opened offline
- [x] R6.5 Every curated and own bucket page loaded on Wi-Fi — useShelfPrefetch tests; device: "Bucket prefetch: 9 buckets", never-opened buckets opened offline with their books
- [x] R6.6 Their covers downloaded, at most 200, stops off Wi-Fi — useShelfPrefetch tests (200 cap, stops off Wi-Fi, a failed cover doesn't stop the rest); device: 39 of 39 covers, shown offline
- [x] R7.1 Reader offline state copy, no system error — device: a book never opened showed "This book isn't downloaded yet" with Retry offline
- [x] R7.2 Download starts on reconnect — device: the download started by itself once the connection came back, no Retry
- [x] R7.3 "Couldn't open this book" for other failures — code review: RNPdfViewer.fail() shows the .failed status ("Couldn't open this book", Retry, no subtitle) for every non-offline error, HTTP status and bad PDF; the message only reaches the log (PdfViewer, ManuscriptScreen). Not reproduced on device
- [x] R8.1 Failed cover image → duotone — BookCoverGradient tests; device: never-seen covers offline showed the placeholder with the title
- [x] R8.2 Offline uses any cached cover image — device: covers seen online (Home, the book being read, curated buckets) showed offline
- [x] R9.1 Progress records when it was read; collapse keeps the latest time — outboxStore and readingProgressStore tests (readAt recorded; collapse keeps the latest save's time)
- [x] R9.2 `read_at` sent with progress — progressService tests (read_at sent as ISO time)
- [x] R9.3 Older write keeps the stored page and returns it — API: TestPutProgressLateSave (late save keeps page 90), run against Postgres
- [x] R9.4 Older write still raises `furthest_page` — API: TestPutProgressLateSave (late save past the line raises furthest to 120)
- [x] R9.5 Missing, bad or future `read_at` uses the server clock — API: TestEffectiveReadAt (missing, unparseable, future → server clock) and TestPutProgressLateSave
- [x] R10.1 Placeholder title bottom-aligned, not clipped — BookCoverGradient tests; device: placeholder titles at the bottom, not clipped (covers cleared on 8 long-title books, then restored)
- [x] R10.2 Long titles ellipsize at 3 lines — BookCoverGradient tests; device: long titles ellipsized
- [x] R10.3 Fits with Larger Text on — maxFontSizeMultiplier 1.3 in BookCoverGradient; device: accepted by the user
- [x] R11.1 Top bar fades in past the hero — device: fades in past the hero
- [x] R11.2 Fades out back at the hero — device: fades out back at the hero
- [x] R11.3 Back button never floats over content without the bar — device: back button never over content without its bar
- [x] R11.4 Same on iPad — device: same on iPad
- [x] R12.1 A sign-in keeps other devices' tokens — API: TestEachDeviceKeepsItsSignIn, run against Postgres
- [x] R12.2 A refresh replaces only its own token — API: TestEachDeviceKeepsItsSignIn (each refreshes in turn; old token single use)
- [x] R12.3 Sign-out ends only that device — API: TestEachDeviceKeepsItsSignIn (phone sign-out leaves the other signed in)
- [x] R12.4 Suspension still ends every sign-in — API: TestSuspendedAccount (refresh refused); suspension still deletes every refresh token (moderation_admin.go)
- [x] R12.5 Expired tokens cleared on sign-in — API: TestSignInClearsExpiredTokens

## Notes
<!-- One line per change from design.md: "Task 3: used X instead of Y because …" -->
- Task 1: the upsert is also covered by an integration test (`internal/server/progress_test.go`, `TestPutProgressLateSave`, on the existing `testdb` harness) instead of only a manual dev-DB check; ROUTES.md had no progress section, so one was added for all three routes.
- Task 2: NetInfo 12.0.1. On iOS its `isConnectionExpensive` means cellular only, with no Low Data Mode signal, so R6.2's Low Data Mode check moves into the native prefetch (task 17). `startConnectivity()` runs in `index.js` beside `initSentry()`, so it's live before the first request and on the Auth stack too. NetInfo's default reachability URL is kept, because the API has no health endpoint and a Cloud Run cold start would read as offline.
- Task 3: one toast shows at a time, so a screen's own "Couldn't …" error would replace the offline toast. `Toaster` now drops error toasts for 3s after `showOfflineToast()`, which is how R1.5's "instead of" is met (an `Alert` used for an error isn't covered). `makeAuthenticatedGetRequest` and `makeAuthenticatedPutRequest` now take `options`, so the outbox can pass `quiet`. The connection is checked on every retry, so going offline mid-backoff ends the retries.
- Task 4: the pill renders in `react-native-screens`' `FullWindowOverlay` on iOS (its own window), because the create flows and the paywall are native modals that would cover a root-level view. It's mounted inside `AppContent` behind `isAuthenticated`, not beside `Toaster`, so the Auth stack never shows it. It's hidden from VoiceOver; the R2.4 announcements carry the state.
- Task 4 (revised on review): the pill moved from under the status bar to 93pt from the bottom, because up top it sat over centred header titles. R2.1 was updated, and toasts rise to 132pt while offline so they don't cover it.
- Task 5: items carry `parentRef` (a reply's parent) beside `ref`. `enqueue` returns `{ cancelled }`, so a store knows when a delete or removal undid a queued write and there's nothing to send. The item being sent can't be cancelled, so a delete or removal queues behind it instead. Items depending on a refused comment are refused without being sent. A kind with no handler yet stops the flush rather than dropping the item. `syncing` lives in the store, ready for the pill in task 6. `hydrateOutbox` is registered in `hydrateCaches` now, with the flush after it in task 6. Sign-out clears only the in-memory copy (task 13 decides about the stored one).
- Task 6: "Syncing…" follows a new `catchingUp` flag, set only by `catchUp()` (the reconnect flush), not by every flush. From task 7 on, each page turn flushes progress, and showing it then would flash the pill online. Launch and foreground flushes are silent. Also fixed a task 5 bug the new tests caught: a flush that ended without awaiting anything left `flushing` set forever, which blocked every later flush.
- Task 7: `ManuscriptScreen.unlockReachedComments` also PUTs progress, directly, to unlock comments mid-read. It now skips when offline (the outbox carries the page) and sends `quiet`, so reading past the spoiler line offline doesn't show the offline toast. On accept, comments are reloaded only when `newly_unlocked` isn't 0, so the usual online page turn doesn't refetch them.
- Task 8: `loadHighlights` also leaves out highlights with a queued removal, which the server still has until it's sent, so they don't reappear (the R3.10 case the design missed). A refused removal draws the highlight again. Recency for the 30-book cap is a new `seenAt` map, set on load and on add. Highlight requests now take `options` for `quiet`. The delete path was pulled into `removeSaved` so the in-flight-removed case queues too. `hydrateHighlights` runs before `hydrateOutbox` so its rows exist when the launch flush updates them.
- Task 9: queued comments keep `pending: true` beside `queued`, so the native sheet keeps treating them as unsaved (no Like, no ⋯) until task 11 gives them their own label and a Delete-only menu. A reply to a comment that's still queued skips the request and queues straight behind its parent. A load also leaves out comments deleted offline (the R3.10 case, as with highlights). A comment mid-request when the app was killed comes back failed, with Retry, so its text isn't lost; retrying can't post it twice. The 30-book cap always keeps books with a queued comment. `deleteCommentRequest` returns 4xx rather than throwing, so its outbox `send` rethrows them. A refused delete (403) reloads the book's comments. Two report-block tests changed: a network failure on delete is now kept, not restored.
- Task 10: likes and comment reads go through the outbox every time (queue, then send), as progress does, not only after a network failure. Otherwise a like queued offline could be sent after an unlike made once back online. The like item carries `before`, the server's state from before the first change still queued, so a refusal puts back what the server has. A refused read reloads the book's comments rather than guessing which dots to restore. A comment not yet saved can't be liked (it has no server id).
- Task 11: `ReaderComment` gains `queued`. A queued comment shows the label instead of the spinner (Like stays off, since there's no server id). Its ⋯ menu offers Delete for your own.
- Task 12: `NotificationService.markAsRead` didn't rethrow (it returned `false`), so it now throws and the store sends reads through the outbox every time, like likes. `getNotifications` returned `[]` on failure, which would have wiped the saved list; it now returns `null` and the store keeps what it has. A refetch keeps notifications read offline as read until the receipt is sent.
- Task 13: Settings already confirmed sign-out with a `ConfirmSheet`, so the same sheet changes its title ("3 changes haven't synced yet"), message and destructive styling when the outbox has items, rather than adding a second alert. Confirming clears the outbox while still signed in, so the account's stored copy is emptied too.
- Task 14: the lobby's "where everyone is" reads the same `remoteProgress` as the pace track, so persisting it (`memberProgress`) covers both R4.3 and R5.1.
- Task 15: the room lobby needs no empty offline state: it always has the route's room, and the stored room list already carries its detail, so only a refetch on reconnect was added (lobby and its member progress). The inbox refetches on reconnect only while it's open. `OFFLINE_MESSAGE` lives in `useOnReconnect.js`. CuratedBucketScreen gained a `failed` state; before, a failed load left an empty page with no message.
- Task 16: the cache read stays on a background queue; only a miss goes to `URLSession`. Besides the R7.1 codes, `.cannotConnectToHost` and `.internationalRoamingOff` also count as offline. A non-2xx answer (an expired presigned URL, say) now fails cleanly instead of trying to parse an error page. `.failed` no longer carries a message to show; the detail goes to `onError` for the log. An offline open is logged as info, not as an error, since the reader recovers from it on its own.
- Task 17: `ManuscriptStore` lives in RNPdfViewer.swift (and is declared in RNPdfViewer.m), because `ManuscriptCache` is private to that file. `prefetch` only caches a response that parses as a PDF. Besides foreground, joining Wi-Fi with the app open also triggers a run, and a run is skipped within 10 minutes of the last one so quick app switches don't hit `GET /progress` each time. iOS only, like the cache.
- Tasks 18–19: a failed image resets when `coverUrl` changes. The image and the gradient got `testID`s (Testing Library 14 has no `UNSAFE_` queries). The title's sibling View clips with `overflow: 'hidden'`, so at worst its third line ellipsizes inside the cover. The iOS simulator build with tasks 11, 16 and 17 succeeded.
- Task 20: the bar is `insets.top` + 66pt (14 above and below the 38pt back button) and fades in over the 60pt before the hero's bottom passes under it. On iPad the hero's bottom is `HERO_HEIGHT_LARGE + insets.top`. The bar's title is hidden from VoiceOver, since it repeats the page title. The bar takes no taps.
- Device review, round 1: the pill covered the comment sheet's composer, so the native sheet now reports open and close (`onCommentSheetChange`), and while it's open the pill sits under the reader's 60pt header. Timeouts were logged as "Aborted" errors and retried 3 times, about a minute in all: they're now named ("Timed out after 15s: GET …"), not retried (R1.3 and R1.4 updated), and no-answer failures log as warnings.
- Device review, round 2: the raised pill read safe-area insets, but it renders beside the NavigationContainer and the app had no root `SafeAreaProvider` (only React Navigation's own, inside the navigators), so it threw on render. `App.js` now wraps `AppNavigator` in `SafeAreaProvider` with `initialWindowMetrics`; React Navigation reuses it. The jest mock of the insets had hidden it.
- Device review, round 3: after going offline and back, the app stayed "Offline" and refused every request. Offline had meant NetInfo's Google reachability check failing, which is slow to recover after a reconnect and never passes where Google is blocked. Offline now means no network (`isConnected === false`), and the reachability check is switched off (no more pings to Google). A captive portal is left to the 15s timeout, as the design's edge cases already said. A stale reading self-corrects: every refused request and every return to the foreground calls `NetInfo.refresh()`, at most every 3s.
- Device review, round 4: still stuck offline on the Simulator, where NetInfo goes on reporting "not connected" after the Mac's network returns, even when asked again. So NetInfo no longer has the last word: while offline, one GET every 5s goes out anyway as a probe (only GETs and only first attempts, so a write is never sent twice). Any HTTP answer to any request marks the app online (`confirmOnline`). A recheck can now only clear "offline"; going offline is left to NetInfo's change events. Home also reloads on reconnect now, since its pull-to-refresh is usually what finds the connection.
- Device review, round 5: the Simulator reported no network on the sign-in screen while online, and Google sign-in (a write) was refused, because probes were reads only and that screen makes none. Any request's first attempt can now be the probe; with truly no network it fails at once and its retry is refused as offline, with the toast.
- Task 21: the refresh handler's separate `SELECT COUNT(*)` check folded into the rotating `UPDATE`, so two refreshes racing with one token can't both pass. `refreshTokenTTL` (7 days) names the expiry the code repeated. R12.4 (suspension) was already covered by `moderation_test.go`. ROUTES.md's `/token/refresh` row named the body field `refresh_token`; the API reads `refreshToken`, so that's corrected too.
- Device review, round 6: with Network Link Conditioner at 100% loss the Wi-Fi stays connected, so NetInfo (with its reachability check off) said online and the pill never showed; each request waited out its 15s. Added R1.6: two requests in a row with no answer (a timeout or a failed connection) on a connected network count as offline (`reportNoAnswer`), and any answer resets the count (`confirmOnline`). The probe brings it back. A backend that's down also reads as "Offline", which is fair: the app can't reach it either way.
- Round 6, continued: recovery needed some request to be made, so a reader just watching the screen would keep the pill after the network came back. While offline, the app now pings `GET /ping` on the API every 10s (5s timeout), and any reply, a 404 included, means it's back. It stops once online.
- Acceptance, R3.6: a comment refused once back online flipped to failed, then vanished, because the reconnect's reload kept only pending or queued comments. The merge (withLocal) now keeps failed ones too, until Retry, Edit or Discard.
- Task 23: the shared URLCache is now 20 MB in memory and 200 MB on disk (AppDelegate). The iOS default, about 10 MB and nothing over ~500 KB, couldn't hold 200 prefetched covers.
- Acceptance, R6.1/R6.3: the shelf prefetch read `row.manuscript_url`, but GET /progress nests the book (`row.book.manuscript_url`), so it found no books; the tests used the same wrong shape. Fixed, with the fixture now matching the API.
