//
//  WidgetSelection.swift
//  ReadPandaWidget
//
//  The shared rules from WIDGETS_13a_13f.md: which book a widget shows, which
//  of its rooms, where a room's deadline stands, and the links a tap follows.
//

import Foundation

/// What the edit sheet pinned. Left on `.recent`, a widget follows the book
/// opened most recently.
enum BookPin: Equatable {
    case recent
    case book(String)
    case room(String)
    case bucket(String)
}

extension WidgetState {

    /// The book a widget shows. A pin that no longer matches anything (the
    /// book was dropped, the room left) falls back to the most recent book
    /// rather than an empty face.
    func book(for pin: BookPin) -> WidgetBook? {
        switch pin {
        case .recent:
            break
        case .book(let id):
            if let book = shelf.first(where: { $0.id == id }) {
                return book
            }
        case .room(let id):
            if let bookId = room(id: id)?.bookId, let book = shelf.first(where: { $0.id == bookId }) {
                return book
            }
        case .bucket(let id):
            if let book = inProgress.first(where: { $0.bucketId == id }) {
                return book
            }
        }
        return currentBook
    }

    /// The room a book is shown with. In several rooms, the nearest deadline
    /// wins — the same order as the reader's "With [Room] ▾" chip — and rooms
    /// without a schedule follow, in the order the book carries them.
    func room(for book: WidgetBook, pinned: String? = nil) -> WidgetRoom? {
        let candidates = book.allRoomIds.compactMap { room(id: $0) }
            + (rooms ?? []).filter { $0.bookId == book.id && !book.allRoomIds.contains($0.id) }
        if let pinned, let match = candidates.first(where: { $0.id == pinned }) {
            return match
        }
        let scheduled = candidates
            .filter { $0.schedule != nil }
            .sorted { ($0.schedule?.dueAt ?? 0) < ($1.schedule?.dueAt ?? 0) }
        return scheduled.first ?? candidates.first
    }

    /// 13d's Up next: the unread books in the book's bucket, in bucket order —
    /// or Curated when it has no bucket, or nothing left in it.
    func upNext(after book: WidgetBook?, limit: Int = 4) -> (source: WidgetBucket, books: [BucketBook])? {
        if let bucket = bucket(id: book?.bucketId) {
            let unread = (bucket.books ?? []).filter { $0.isUnread && $0.id != book?.id }
            if !unread.isEmpty {
                return (bucket, Array(unread.prefix(limit)))
            }
        }
        if let curated, !(curated.books ?? []).isEmpty {
            let unread = (curated.books ?? []).filter { $0.isUnread && $0.id != book?.id }
            return unread.isEmpty ? nil : (curated, Array(unread.prefix(limit)))
        }
        return nil
    }

    /// 13e's trigger: a book finished within the last 3 days, and nothing else
    /// on the go.
    func betweenBooks(at date: Date) -> LastFinished? {
        guard inProgress.isEmpty, let finished = lastFinished, let at = finished.date,
            let days = WidgetCopy.calendarDays(from: at, to: date), (0...3).contains(days)
        else {
            return nil
        }
        return finished
    }

    /// 13e's covers: the finished book's bucket first (unread, in order), then
    /// Curated, three in all. The label names where the first one came from.
    func nextPicks(after finished: LastFinished, limit: Int = 3) -> (label: String, books: [BucketBook]) {
        var picks: [BucketBook] = []
        var label = "Curated"
        if let bucket = bucket(id: finished.bucketId) {
            picks = (bucket.books ?? []).filter { $0.isUnread && $0.id != finished.bookId }
            if !picks.isEmpty {
                label = bucket.name
            }
        }
        for book in curated?.books ?? [] where picks.count < limit {
            if book.isUnread, book.id != finished.bookId, !picks.contains(where: { $0.id == book.id }) {
                picks.append(book)
            }
        }
        return (label, Array(picks.prefix(limit)))
    }
}

// MARK: - Room deadline (13b)

/// Where the reader stands against their room's current target.
struct Deadline {
    enum Status: Equatable {
        case ahead
        case dueToday
        case daysLeft(Int)
        case overdue
    }

    let room: WidgetRoom
    let schedule: RoomSchedule
    let book: WidgetBook
    let status: Status

    init(room: WidgetRoom, schedule: RoomSchedule, book: WidgetBook, now: Date) {
        self.room = room
        self.schedule = schedule
        self.book = book
        let days = WidgetCopy.calendarDays(from: now, to: schedule.dueDate) ?? 0
        if book.currentPage >= schedule.target {
            status = .ahead
        } else if days == 0 {
            status = .dueToday
        } else if days < 0 {
            status = .overdue
        } else {
            status = .daysLeft(days)
        }
    }

    /// The bar covers the scheduled stretch, with the target at this point
    /// along it — so reading past the target still shows.
    static let tickPosition = 0.85

    var barFraction: Double {
        let span = Double(max(1, schedule.target - schedule.start + 1))
        let done = Double(book.currentPage - schedule.start + 1)
        return max(0, done / span * Deadline.tickPosition)
    }

    /// "Ch. 4" when the book has chapters, "p. 120" otherwise.
    var targetLabel: String {
        WidgetCopy.place(book, page: schedule.target)
    }
}

extension WidgetState {
    func deadline(for book: WidgetBook, pinnedRoom: String? = nil, now: Date) -> Deadline? {
        guard let room = room(for: book, pinned: pinnedRoom), let schedule = room.schedule else {
            return nil
        }
        return Deadline(room: room, schedule: schedule, book: book, now: now)
    }
}

// MARK: - Links

/// Where a tap goes (src/hooks/useWidgetDeepLink.js).
enum WidgetLink {
    static func reader(_ book: WidgetBook, room: WidgetRoom? = nil) -> URL? {
        var items = [URLQueryItem(name: "page", value: String(max(0, book.currentPage - 1)))]
        if let room {
            items.append(URLQueryItem(name: "room", value: room.id))
        }
        return url("read", book.id, items)
    }

    static func bookDetail(_ book: BucketBook) -> URL? {
        url("book", book.id, [URLQueryItem(name: "title", value: book.title)])
    }

    static func bucket(_ bucket: WidgetBucket) -> URL? {
        url("bucket", bucket.id, [
            URLQueryItem(name: "kind", value: bucket.isCurated ? "curated" : "user"),
            URLQueryItem(name: "name", value: bucket.name),
        ])
    }

    static func room(_ room: WidgetRoom) -> URL? {
        url("room", room.id, [])
    }

    static let library = URL(string: "readpanda://library")

    private static func url(_ host: String, _ id: String, _ items: [URLQueryItem]) -> URL? {
        var components = URLComponents()
        components.scheme = "readpanda"
        components.host = host
        components.path = "/" + id
        components.queryItems = items.isEmpty ? nil : items
        return components.url
    }
}
