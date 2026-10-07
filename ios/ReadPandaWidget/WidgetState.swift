//
//  WidgetState.swift
//  ReadPandaWidget
//
//  What the app hands the widgets (src/widget/widgetState.js — change them
//  together). The app writes it (WidgetBridge.swift) into the shared App Group
//  on every progress save and whenever the stores behind it change; the
//  widgets only ever read it. Covers are downloaded by the app into the same
//  container, so the extension never touches the network.
//
//  Every book's page is the one stored position the reader writes, so no
//  widget can show a different page than the app.
//
//  Numbers arrive from JavaScript, where every number is a double, so they're
//  decoded as Double and read through Int conveniences. Everything added for
//  WIDGETS_13a_13f.md is optional, so a state written by an older build still
//  decodes.
//

import Foundation
import UIKit

enum WidgetShared {
    static let appGroup = "group.com.readpanda.app"
    static let stateFile = "widget-state.json"
    static let coversFolder = "Covers"

    static var container: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)
    }
}

struct FriendAhead: Codable, Hashable {
    let name: String
    let pagesAhead: Double

    var pages: Int { Int(pagesAhead) }
}

struct Teaser: Codable, Hashable {
    let author: String
    let text: String
}

/// 13d's line under the room: the newest comment the reader has unlocked.
struct Snippet: Codable, Hashable {
    let author: String
    let text: String
    let page: Double?
}

/// A room's reading schedule: reach `targetPage` by `dueAt`. The API doesn't
/// send one yet; until it does, the deadline faces fall back to their solo
/// versions.
struct RoomSchedule: Codable, Hashable {
    /// 1-based, the last page of the stretch.
    let targetPage: Double
    /// 1-based, where this stretch started.
    let startPage: Double?
    /// Milliseconds since epoch.
    let dueAt: Double

    var target: Int { Int(targetPage) }
    var start: Int { max(1, Int(startPage ?? 1)) }
    var dueDate: Date { Date(timeIntervalSince1970: dueAt / 1000) }
}

struct WidgetBook: Codable, Hashable {
    let id: String
    let title: String
    /// 1-based, as the reader shows it.
    let page: Double
    let totalPages: Double
    let finished: Bool?
    /// Milliseconds since epoch.
    let lastReadAt: Double?
    /// The room the book was opened with, then every room reading it.
    let roomId: String?
    let roomIds: [String]?
    let bucketId: String?
    /// The first page (0-based) of each chapter, from the PDF's outline.
    let chapters: [Double]?
    let coverFile: String?
    let duotone: [String]?
    /// The nearest room member who is further along. Absent for solo books.
    let friendAhead: FriendAhead?

    var currentPage: Int { Int(page) }
    var pageCount: Int { Int(totalPages) }
    var isFinished: Bool { finished ?? false }
    var started: Bool { pageCount > 0 }

    var fraction: Double {
        pageCount > 0 ? Double(currentPage) / Double(pageCount) : 0
    }

    var percent: Int { Int((fraction * 100).rounded()) }

    var allRoomIds: [String] {
        var ids = roomIds ?? []
        if let roomId, !ids.contains(roomId) {
            ids.insert(roomId, at: 0)
        }
        return ids
    }

    // MARK: Chapters

    private var chapterStarts: [Int] {
        (chapters ?? []).map { Int($0) }.filter { $0 >= 0 && $0 < max(pageCount, 1) }
    }

    var hasChapters: Bool { chapterStarts.count >= 2 }

    /// 1-based chapter holding a 1-based page. Front matter before the first
    /// chapter counts as chapter 1.
    func chapter(atPage page: Int) -> Int? {
        let starts = chapterStarts
        guard starts.count >= 2 else {
            return nil
        }
        let index = max(0, page - 1)
        return (starts.lastIndex { $0 <= index } ?? 0) + 1
    }

    var currentChapter: Int? { chapter(atPage: currentPage) }

    /// 1-based pages [first, last] of a 1-based chapter.
    func pages(ofChapter number: Int) -> ClosedRange<Int>? {
        let starts = chapterStarts
        guard starts.count >= 2, number >= 1, number <= starts.count else {
            return nil
        }
        let first = number == 1 ? 1 : starts[number - 1] + 1
        let last = number < starts.count ? starts[number] : pageCount
        return first...max(first, last)
    }

    /// How far through the current chapter the reader is, 0...1.
    var chapterFraction: Double? {
        guard let number = currentChapter, let range = pages(ofChapter: number) else {
            return nil
        }
        let span = Double(range.upperBound - range.lowerBound + 1)
        return min(1, max(0, Double(currentPage - range.lowerBound + 1) / span))
    }

    var averageChapterPages: Double? {
        let count = chapterStarts.count
        return count >= 2 && pageCount > 0 ? Double(pageCount) / Double(count) : nil
    }
}

struct WidgetRoom: Codable, Hashable, Identifiable {
    let id: String
    let name: String
    let bookId: String?
    let bookTitle: String?
    let coverFile: String?
    let duotone: [String]?
    let memberInitials: [String]?
    /// Only comments the reader has already reached — the widget never spoils.
    let unlockedUnreadCount: Double?
    /// The first words of the nearest waiting (unlocked) comment.
    let teaser: Teaser?
    let snippet: Snippet?
    let myPage: Double?
    let medianPage: Double?
    let totalPages: Double?
    let lastActivityAt: Double?
    /// Whoever is furthest ahead, for the "you're caught up" line.
    let leader: FriendAhead?
    let schedule: RoomSchedule?

    var waiting: Int { Int(unlockedUnreadCount ?? 0) }
}

/// A book in a bucket, as far as the covers need it.
struct BucketBook: Codable, Hashable, Identifiable {
    let id: String
    let title: String
    let coverFile: String?
    let duotone: [String]?
    /// "unread", "reading" or "finished".
    let state: String?

    var isUnread: Bool { (state ?? "unread") == "unread" }
}

struct WidgetBucket: Codable, Hashable, Identifiable {
    let id: String
    let name: String
    /// "user" or "curated" — which screen a tap opens.
    let kind: String?
    let books: [BucketBook]?

    var isCurated: Bool { kind == "curated" }
}

struct LastFinished: Codable, Hashable {
    let bookId: String
    let title: String
    let finishedAt: Double?
    let bucketId: String?

    var date: Date? { finishedAt.map { Date(timeIntervalSince1970: $0 / 1000) } }
}

struct WidgetState: Codable {
    /// Every book on the shelf, most recently opened first.
    let books: [WidgetBook]?
    let rooms: [WidgetRoom]?
    let buckets: [WidgetBucket]?
    let curated: WidgetBucket?
    /// Measured from the reader's own page turns. Nil until there's enough.
    let paceMinPerPage: Double?
    let lastFinished: LastFinished?
    let streak: Double?
    let updatedAt: Double?

    var streakDays: Int { Int(streak ?? 0) }
    var shelf: [WidgetBook] { books ?? [] }

    /// Books being read: on the shelf and not finished, most recent first.
    var inProgress: [WidgetBook] { shelf.filter { !$0.isFinished } }

    /// The book opened most recently that isn't finished — 5a's book and the
    /// default for every book widget.
    var currentBook: WidgetBook? { inProgress.first }

    static let empty = WidgetState(
        books: [], rooms: [], buckets: [], curated: nil,
        paceMinPerPage: nil, lastFinished: nil, streak: 0, updatedAt: nil
    )

    static func load() -> WidgetState {
        guard let url = WidgetShared.container?.appendingPathComponent(WidgetShared.stateFile),
            let data = try? Data(contentsOf: url),
            let state = try? JSONDecoder().decode(WidgetState.self, from: data)
        else {
            return .empty
        }
        return state
    }

    func room(id: String?) -> WidgetRoom? {
        guard let id else {
            return nil
        }
        return rooms?.first { $0.id == id }
    }

    func bucket(id: String?) -> WidgetBucket? {
        guard let id else {
            return nil
        }
        return buckets?.first { $0.id == id }
    }

    /// The room 5b shows: the pinned one if it still exists, otherwise the one
    /// with the most waiting comments, most recent activity breaking ties.
    func pulseRoom(pinnedId: String?) -> WidgetRoom? {
        let all = rooms ?? []
        if let pinnedId, let pinned = all.first(where: { $0.id == pinnedId }) {
            return pinned
        }
        return all.max { a, b in
            if a.waiting != b.waiting {
                return a.waiting < b.waiting
            }
            return (a.lastActivityAt ?? 0) < (b.lastActivityAt ?? 0)
        }
    }
}

/// A cover the app already cached, downscaled for the widget.
func cachedCover(_ file: String?) -> UIImage? {
    guard let file, !file.isEmpty,
        let url = WidgetShared.container?
            .appendingPathComponent(WidgetShared.coversFolder)
            .appendingPathComponent(file)
    else {
        return nil
    }
    return UIImage(contentsOfFile: url.path)
}
