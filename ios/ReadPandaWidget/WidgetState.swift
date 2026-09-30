//
//  WidgetState.swift
//  ReadPandaWidget
//
//  What the app hands the widget. The app writes it (WidgetBridge.swift) into
//  the shared App Group on every progress save and whenever the stores behind
//  it change; the widget only ever reads it. Covers are downloaded by the app
//  into the same container, so the extension never touches the network.
//
//  Numbers arrive from JavaScript, where every number is a double, so they're
//  decoded as Double and read through Int conveniences.
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

struct WidgetBook: Codable, Hashable {
    let id: String
    let title: String
    /// 1-based, as the reader shows it.
    let page: Double
    let totalPages: Double
    /// Milliseconds since epoch.
    let lastReadAt: Double?
    let roomId: String?
    let coverFile: String?
    let duotone: [String]?
    /// The nearest room member who is further along. Absent for solo books.
    let friendAhead: FriendAhead?

    var currentPage: Int { Int(page) }
    var pageCount: Int { Int(totalPages) }
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
    let myPage: Double?
    let medianPage: Double?
    let totalPages: Double?
    let lastActivityAt: Double?
    /// Whoever is furthest ahead, for the "you're caught up" line.
    let leader: FriendAhead?

    var waiting: Int { Int(unlockedUnreadCount ?? 0) }
}

struct WidgetState: Codable {
    let currentBook: WidgetBook?
    let streak: Double?
    let rooms: [WidgetRoom]?
    let updatedAt: Double?

    var streakDays: Int { Int(streak ?? 0) }

    static let empty = WidgetState(currentBook: nil, streak: 0, rooms: [], updatedAt: nil)

    static func load() -> WidgetState {
        guard let url = WidgetShared.container?.appendingPathComponent(WidgetShared.stateFile),
            let data = try? Data(contentsOf: url),
            let state = try? JSONDecoder().decode(WidgetState.self, from: data)
        else {
            return .empty
        }
        return state
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
