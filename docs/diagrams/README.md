# Flow diagrams

Mermaid sources tracing each user-facing flow through the screens, Zustand
stores, services and API that actually implement it. Every file opens with a
`%%` comment block mapping its participant aliases to source files.

| Diagram | Flow |
| --- | --- |
| [navigation-map.mmd](navigation-map.mmd) | Navigator tree and every `navigate()` edge between screens |
| [app-01-launch.mmd](app-01-launch.mmd) | Cold start — splash, session restore from MMKV, Auth vs. Main, cold-start invite link |
| [auth-01-login.mmd](auth-01-login.mmd) | Email and Google (iOS / Android) login, then preferences fetch |
| [auth-02-signup-interests.mmd](auth-02-signup-interests.mmd) | Sign up, Home sending a new user to Interest, saving picks |
| [auth-03-token-refresh.mmd](auth-03-token-refresh.mmd) | Every authenticated request — 401/498 refresh-and-retry, queueing, 5xx and network backoff |
| [auth-04-sign-out.mmd](auth-04-sign-out.mmd) | Sign out and what is (and isn't) cleared |
| [home-01-load.mmd](home-01-load.mmd) | Loading "Tonight" — hero state, rooms, curated picks, pace, first-run pick |
| [home-02-notifications.mmd](home-02-notifications.mmd) | The bell inbox, mark-as-read, and the unwired push path |
| [rooms-01-create-join.mmd](rooms-01-create-join.mmd) | Creating a room (optionally seeded with a book) and joining by code or deep link |
| [rooms-02-lobby.mmd](rooms-02-lobby.mmd) | Room lobby — choosing a book or bucket, the reading lock, starting to read |
| [rooms-03-leave-delete-reconcile.mmd](rooms-03-leave-delete-reconcile.mmd) | Leaving / deleting a room, detaching its books, reconciling, attach rules |
| [reading-01-shelf.mmd](reading-01-shelf.mmd) | Reading tab shelf, and the room / solo detail screens |
| [reading-02-session.mmd](reading-02-session.mmd) | A reading session — where progress is saved (MMKV, SQLite, PUT /progress) |
| [buckets-01-browse-manage.mmd](buckets-01-browse-manage.mmd) | Library, creating a bucket, opening one, removing books, deleting |

## Issues the diagrams surfaced — now fixed

Tracing the flows turned up seven bugs. The diagrams above show the fixed behaviour.

1. **Dead refresh token left the user signed in** (auth-03). `AuthProvider` now registers `authStore.signOut` via `apiService.setAuthFailureCallback`, so a rejected refresh token lands the reader on Login.
2. **Interest screen on every cold start after sign-up** (auth-02). `InterestScreen` clears `isNewUser` on "Done!", with or without changes, and returns with `goBack()`. The old `reset` targeted `HomeMain`, which isn't a route in that stack.
3. **Notification tap crashed the reader** (home-02). `NotificationList` resolves the id to a full book from `booksStore`, fetching it if needed, before opening `ManuscriptScreen`.
4. **Curated buckets only showed 2 books** (buckets-01). Home and `CuratedBuckets` now pass `bucket_id`, so `BucketBooksScreen` loads the full list.
5. **Stores leaked across accounts** (auth-04). `signOut` also clears rooms (including `roomsLoaded`), buckets, books and notifications.
6. **Progress was lost if the app was killed** (reading-02). `ManuscriptScreen` also saves on `AppState` `inactive` / `background`, skipping duplicates. The page refs now start from the saved position, so an early save can't reset the reader to page 1.
7. **Push wasn't wired** (home-02). `usePushNotifications` asks for permission after sign-in and turns foreground or tapped pushes into refreshes of the server inbox. The orphaned local MMKV list (`utils/notification.js`) is gone. The inbox now sends `?username=` and maps the API's `is_read` / `created_at` / `unread_count`, none of which it read before. Home refreshes the badge on load.

Also fixed: `ProfileScreen` no longer calls `JSON.parse` on preferences that are already an object when it opens Interest.

### Backend follow-up — done

The API side lives in `readpanda/packages/api-go`. Run `scripts/migrate_notifications_push.sql` first. Routes are documented in its `ROUTES.md`.

- **Device tokens.** `POST /users/me/devices` registers the FCM token (and re-registers on rotation). `DELETE /users/me/devices/{token}` runs on sign-out. Tokens upsert on the token itself, so a phone that switches accounts moves to the new one.
- **Pushes are actually sent.** `internal/notify` writes the inbox row, then fans out over FCM in the background and deletes dead tokens. Publishing a book with a manuscript sends `NEW_BOOK` to every other reader.
- **`PUT /notifications/{id}/read`** exists. Mark-as-read is still optimistic in the app, but now reverts if the server refuses.
- **Notifications carry `type`, `title` and `book_id`.** Tapping a NEW_BOOK row or push opens the reader via `utils/readerBook.js`.
- **An empty inbox is `[]`.** The routes take the user from the token instead of `?username=`, which had let any signed-in user read anyone's inbox.

Still open:

- **Android push.** It needs `google-services.json` from the Firebase console. Until then it fails without crashing.
- **Push needs server credentials.** `FIREBASE_PROJECT_ID` plus the service account, with the FCM API enabled. Without them the inbox works and nothing is pushed.
- **Only book publishing notifies.** `POST /books/seed` deliberately doesn't, to avoid a burst per seeded book. Nothing notifies on room or comment activity yet.

The "See all" views (10c–10e) are `BookGrid` (Discover › Popular, Home › Curated for you), `BucketGrid` (Discover › Curated buckets, My Books › My buckets) and the `Shelf` (My Books › Currently reading). They replace `GenreBooksScreen`.

The older [../sequence_diagrams/](../sequence_diagrams/) files describe intended designs (email verification, push registration) that the code doesn't implement. Where they disagree, trust these.

---

# Comments — end-to-end sequence diagrams

The in-book comment layer spans four boundaries: the native reader, the React
Native bridge, the Zustand store, and the API. These diagrams trace each flow
across all four.

| Diagram | Flow |
| --- | --- |
| [comments-01-load.mmd](comments-01-load.mmd) | Entering the reader — fetch the conversation and draw it on the page |
| [comments-02-open-thread.mmd](comments-02-open-thread.mmd) | Opening a thread from a gutter dot, a prop, or the header icon, and the read receipt |
| [comments-03-post.mmd](comments-03-post.mmd) | Posting a comment or reply, with both the 201 and failure branches |
| [comments-04-retry-like.mmd](comments-04-retry-like.mmd) | Retrying a failed comment, and liking one |

## Participants

| Alias | File |
| --- | --- |
| `SH` | `ios/CommentSheetView.swift` |
| `NV` | `ios/RNPdfViewer.swift` — `RNPdfView` |
| `JS` | `src/components/PdfViewer.js` |
| `MS` | `src/screens/ManuscriptScreen.js` |
| `ST` | `src/stores/commentsStore.js` |
| `API` | `src/services/commentsService.js` |

Props and events between `NV` and `JS` all pass through the
`RCT_EXPORT_VIEW_PROPERTY` declarations in `ios/RNPdfViewer.m`.

## What the diagrams make visible

**There is no inbound path.** Every arrow into `commentsStore` starts from a
reader action or the mount effect. Nothing pushes — no socket, no poll — so
comments written by other readers only appear when `loadComments` runs again on
re-entering the screen.

**Optimistic state is the render contract.** The native side never tracks
in-flight writes. `pending`, `failed` and `read` all arrive inside the `threads`
prop, so the sheet renders the entire lifecycle from data it was handed.

**A draft is tracked by page and passage, not by key.** The store mints a local
`pending:<clientId>` anchor key and swaps in the server's key when the write
lands. `SheetTarget.draft` matches on page plus anchor text instead — the same
rule `addComment` uses to place a comment — so the sheet survives the key swap
mid-post. This appears in diagram 3 as the step right after the optimistic
insert, and again at the 201 branch.

## Rendering

These are plain Mermaid (`.mmd`) sources, renderable without the surrounding
markdown:

```sh
# one-off PNG or SVG
npx -y @mermaid-js/mermaid-cli -i comments-03-post.mmd -o comments-03-post.svg

# validate every diagram
for f in *.mmd; do npx -y @mermaid-js/mermaid-cli -q -i "$f" -o "/tmp/${f%.mmd}.svg" || echo "FAIL $f"; done
```

Avoid `;` in message and note text — Mermaid reads it as a statement break.

They also render inline on GitHub when embedded in a fenced `mermaid` block, and
in VS Code via the Markdown Preview Mermaid Support extension. For a quick look,
paste the file contents into <https://mermaid.live>.
