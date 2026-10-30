# Coming soon: Requirements

Status: Approved <!-- Draft → Approved -->
Design handoff: docs/handoff/ReadPanda Design Review.dc.html, for the entry points only: 8a's "Search books" field, 8b's "Finished · N books" link, 9a's "⋯ renames or deletes" and "+", 7a's "Edit profile" pill. There's no mockup of the search results, the rename sheet, the add-books picker in a bucket, or the Edit profile screen; they're built from existing screens and sheets.

## Goal
Seven buttons in the app show a "coming soon" toast instead of doing anything:
Discover's search, the Finished link on My Books and Reading, renaming a
bucket, adding books from inside a bucket, and Edit profile. Before the app
reaches TestFlight testers and App Review, each does what it says.

## Out of scope
- Editing or uploading a profile photo. The photo stays as it is today: the
  one Google gives at sign-in, or one picked on Profile, saved on this device
  only.
- Showing the display name anywhere but the reader's own Profile (comments,
  rooms and members keep showing usernames).
- Confirming a new email by link, and "Forgot password": the server can't
  send email yet.
- Searching by genre, topic or the text of a book.
- Android, which has no reader yet and isn't in 1.0.

## Flows

Searching on Discover:

```mermaid
sequenceDiagram
    autonumber
    actor R as Reader
    participant D as App (Discover)
    participant API
    R->>D: types in "Search books" (R1.1)
    D->>D: waits until 2+ characters and a short pause (R1.1)
    D->>API: GET /books/search?q= (R1.6)
    alt matches
        API-->>D: books, best match first (R1.6)
        D-->>R: results grid in place of the sections (R1.1)
        R->>D: taps a cover
        D-->>R: Book detail (R1.5)
    else none
        API-->>D: no books
        D-->>R: Nothing matches "…" (R1.3)
    else offline or error
        D-->>R: Search needs a connection (R1.4)
    end
    R->>D: clears the field (R1.2)
    D-->>R: Discover's sections again
```

Changing a bucket from inside it:

```mermaid
sequenceDiagram
    autonumber
    actor R as Reader
    participant B as App (My bucket)
    participant P as App (book picker)
    participant API
    alt rename
        R->>B: ⋯ → Rename (R3.1)
        B-->>R: rename sheet, current name filled in (R3.1)
        R->>B: Save
        B->>API: PUT /users/me/buckets/{id} (R3.2)
        alt saved
            B-->>R: new name everywhere (R3.2)
        else failed
            B-->>R: sheet stays, "Couldn't rename. Try again." (R3.3)
        end
    else add books
        R->>B: + (R4.1)
        B->>P: picker in add mode, bucket's books marked (R4.1)
        R->>P: filters, picks, Add (R4.3, R4.2)
        P->>API: POST /users/me/buckets/{id}/books (R4.2)
        alt added
            P-->>R: back in the bucket, new books at the end (R4.2)
        else failed
            P-->>R: picks kept, "Couldn't add the books. Try again." (R4.4)
        end
    end
```

Changing the username:

```mermaid
sequenceDiagram
    autonumber
    actor R as Reader
    participant E as App (Edit profile)
    participant API
    participant D as Device storage
    R->>E: Username → types a new one (R5.3)
    E->>API: GET /signup/available?username= (R5.3)
    API-->>E: free, or taken with a suggestion (R5.3)
    R->>E: Save
    E->>API: PATCH /users/me { username } (R5.8)
    alt saved
        API-->>E: updated profile
        E->>D: move this account's stored data to the new name (R5.4)
        E-->>R: new @username on Profile, comments and rooms follow (R5.4)
    else taken meanwhile
        API-->>E: 409
        E-->>R: "That username was just taken." (R5.3)
    end
```

Changing email or password (email accounts):

```mermaid
sequenceDiagram
    autonumber
    actor R as Reader
    participant E as App (Edit profile)
    participant API
    R->>E: Email or Password (R5.1)
    E-->>R: sheet asking for the current password too (R5.5, R5.6)
    R->>E: Save
    E->>API: PUT /users/me/email or /users/me/password (R5.8)
    alt saved
        API-->>E: 204 / updated profile
        E-->>R: "Email changed." / "Password changed." (R5.5, R5.6)
    else wrong current password
        API-->>E: 403
        E-->>R: "That password isn't right." (R5.5, R5.6)
    else email in use
        API-->>E: 409
        E-->>R: "That email is already in use." (R5.5)
    end
```

## Requirements

### R1. Search on Discover
**User story:** As a reader, I want to find a book by its title or author, so
that I can start it without scrolling.

**Acceptance criteria**
1. WHEN the reader types 2 or more characters in Discover's "Search books"
   field and pauses (300ms) THE Discover screen SHALL show the matching books
   as a cover grid in place of its sections.
2. WHEN the field is cleared or cancelled THE Discover screen SHALL show its
   sections again, as they were.
3. IF nothing matches THEN THE screen SHALL say `Nothing matches "<query>".`
4. IF the search can't reach the server THEN THE screen SHALL say "Search
   needs a connection." and search again when the reader edits the query.
5. WHEN the reader taps a result THE app SHALL open Book detail (8c).
6. `GET /books/search?q=` SHALL match `q` (2 or more characters, after
   trimming) case-insensitively against title and author name, over the same
   books `/books/all` returns, and return up to 50, ordered: title starts with
   `q`, then title contains `q`, then author contains `q`, then by title. It
   SHALL return `400` for a shorter `q`.
7. THE field's placeholder SHALL read "Title or author".

### R2. Finished books
**User story:** As a reader, I want to see every book I've finished.

**Acceptance criteria**
1. WHEN the reader taps "Finished · N books" on My Books or Reading THE app
   SHALL open a cover grid of every finished book (started, at 100%), the
   most recently read first.
2. Each cover SHALL show the finished check and open Book detail when tapped.
3. THE grid SHALL work offline: it's the books on this device's shelf.

### R3. Rename a bucket
**User story:** As a reader, I want to rename a bucket.

**Acceptance criteria**
1. WHEN the reader chooses Rename (My bucket's ⋯, or the bucket grid's) THE
   app SHALL open a rename sheet with the current name filled in, and Save
   SHALL stay disabled until the name is 1–40 characters (trimmed) and
   different.
2. WHEN the rename saves THE new name SHALL show everywhere the bucket does.
3. IF the rename fails THEN THE sheet SHALL stay open with "Couldn't rename.
   Try again." and the old name SHALL stay.
4. THE same sheet SHALL be used on iOS and Android (it replaces the iOS
   system prompt).

### R4. Add books from inside a bucket
**User story:** As a reader, I want to add books to a bucket I already have.

**Acceptance criteria**
1. WHEN the reader taps + in My bucket THE app SHALL open the book picker
   (New bucket's, with My library, Discover and search) titled "Add to
   <bucket>", with the books already in the bucket marked and not pickable.
2. WHEN the reader taps Add THE picked books SHALL be added to the bucket,
   after its existing books, and the reader SHALL return to the bucket.
3. THE picker's search SHALL filter the books it shows, as it does in New
   bucket.
4. IF adding fails THEN THE picks SHALL be kept and THE picker SHALL say
   "Couldn't add the books. Try again."

### R5. Edit profile
**User story:** As a reader, I want to change my name, username, email and
password.

**Acceptance criteria**
1. WHEN the reader taps Edit profile THE app SHALL open an Edit profile
   screen with rows for Display name and Username, and, for accounts that
   sign in with email and password only, Email and Password. Each row opens
   its own sheet.
2. Display name SHALL be 0–40 characters after trimming. Saved, it SHALL show
   on the reader's Profile above `@username`; empty, the Profile SHALL show
   the username as now.
3. Username SHALL follow the sign-up rules (3–20 letters, numbers, `.` or `_`,
   stored lowercase). Its sheet SHALL check availability as the reader types
   and offer the suggestion when taken. IF it's taken by the time it's saved
   THEN THE sheet SHALL say "That username was just taken."
4. WHEN the username changes THE reader's comments, rooms and Profile SHALL
   show the new one, and THE app SHALL move everything this account stored on
   the device to the new username, so nothing is lost.
5. Email SHALL need the current password and a valid address. IF the
   password is wrong THEN "That password isn't right."; IF another account
   uses the address THEN "That email is already in use."
6. Password SHALL need the current password and a new one of 8 or more
   characters, entered twice. IF the current one is wrong THEN "That password
   isn't right."
7. FOR an account that signs in with Apple or Google THE screen SHALL NOT
   show Email or Password, and SHALL show "Signed in with Apple" or "Signed
   in with Google" instead.
8. The server SHALL add `GET /users/me` (read on opening Edit profile),
   `PATCH /users/me` (`display_name`, `username`),
   `PUT /users/me/email` (`email`, `current_password`) and
   `PUT /users/me/password` (`current_password`, `new_password`); and sign-up,
   login, Google, Apple and refresh responses SHALL include `user_id`,
   `display_name` and `login_type`.

### R6. ReadPanda+ follows the account
**User story:** As a subscriber, I want my subscription to survive a username
change.

**Acceptance criteria**
1. THE app SHALL identify the reader to RevenueCat by their account id
   (`user_id`), not their username.
2. WHEN a stored session from before this change has no `user_id` THE app
   SHALL get it from the server at launch (or the next token refresh), and
   SHALL NOT identify the reader
   to RevenueCat by username in the meantime.

## Open questions
- [x] Rename: the in-app sheet on iOS too (R3.4).
- [x] Search: 300ms pause, 2 characters, 50 results.
- [x] The picker's search stays a filter, in New bucket and in add mode (R4.3).
- [x] The profile photo stays as it is (Google's, or picked on the device); no R7.
