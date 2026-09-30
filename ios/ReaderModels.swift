//
//  ReaderModels.swift
//  ReadPanda
//
//  The comment layer as the native reader sees it.
//
//  JS owns the store, the API and the optimistic retry queue; it pushes the
//  resulting threads across the bridge as plain dictionaries. These types are
//  the typed read of that payload — parsing happens once, at the prop
//  boundary, so nothing further in draws from `NSDictionary` by key.
//

import Foundation
import UIKit

/// A rect stored as fractions of the page box, so an anchor survives zoom,
/// rotation and a different device.
struct NormalizedRect {
    let x: CGFloat
    let y: CGFloat
    let w: CGFloat
    let h: CGFloat

    init?(_ raw: Any?) {
        guard let dict = raw as? [String: Any],
            let x = (dict["x"] as? NSNumber)?.doubleValue,
            let y = (dict["y"] as? NSNumber)?.doubleValue,
            let w = (dict["w"] as? NSNumber)?.doubleValue,
            let h = (dict["h"] as? NSNumber)?.doubleValue
        else {
            return nil
        }
        self.x = CGFloat(x)
        self.y = CGFloat(y)
        self.w = CGFloat(w)
        self.h = CGFloat(h)
    }

    init(x: CGFloat, y: CGFloat, w: CGFloat, h: CGFloat) {
        self.x = x
        self.y = y
        self.w = w
        self.h = h
    }

    /// What crosses back to JS. Plain numbers only — the bridge takes nothing else.
    var payload: [String: CGFloat] {
        return ["x": x, "y": y, "w": w, "h": h]
    }

    /// The rect in page space, given that page's crop box.
    func denormalized(in box: CGRect) -> CGRect {
        return CGRect(
            x: box.origin.x + x * box.width,
            y: box.origin.y + y * box.height,
            width: w * box.width,
            height: h * box.height
        )
    }
}

struct ReaderComment {
    let id: String
    let clientId: String
    let username: String
    let initials: String
    let page: Int
    let body: String
    let parentId: String?
    let likes: Int
    let likedByMe: Bool
    let read: Bool
    /// Milliseconds since epoch, as JS counts them.
    let createdAt: Double
    let pending: Bool
    let failed: Bool
    let replies: [ReaderComment]

    init(_ dict: NSDictionary) {
        id = ReaderComment.string(dict["id"])
        clientId = ReaderComment.string(dict["clientId"])
        username = ReaderComment.string(dict["username"])
        initials = ReaderComment.string(dict["initials"])
        page = (dict["page"] as? NSNumber)?.intValue ?? 0
        body = ReaderComment.string(dict["body"])
        let parent = ReaderComment.string(dict["parentId"])
        parentId = parent.isEmpty ? nil : parent
        likes = (dict["likes"] as? NSNumber)?.intValue ?? 0
        likedByMe = (dict["likedByMe"] as? NSNumber)?.boolValue ?? false
        read = (dict["read"] as? NSNumber)?.boolValue ?? true
        createdAt = (dict["createdAt"] as? NSNumber)?.doubleValue ?? 0
        pending = (dict["pending"] as? NSNumber)?.boolValue ?? false
        failed = (dict["failed"] as? NSNumber)?.boolValue ?? false
        replies = ((dict["replies"] as? [NSDictionary]) ?? []).map { ReaderComment($0) }
    }

    /// Ids arrive as strings from the server and as minted client ids locally;
    /// a numeric id would otherwise read as an empty string.
    private static func string(_ raw: Any?) -> String {
        if let s = raw as? String {
            return s
        }
        if let n = raw as? NSNumber {
            return n.stringValue
        }
        return ""
    }
}

struct ReaderThread {
    let anchorKey: String
    let page: Int
    let anchorText: String
    let bounds: [NormalizedRect]
    let unreadCount: Int
    let fileHash: String
    let comments: [ReaderComment]

    init(_ dict: NSDictionary) {
        anchorKey = (dict["anchorKey"] as? String) ?? ""
        page = (dict["page"] as? NSNumber)?.intValue ?? 0
        anchorText = (dict["anchorText"] as? String) ?? ""
        bounds = ((dict["bounds"] as? [Any]) ?? []).compactMap { NormalizedRect($0) }
        unreadCount = (dict["unreadCount"] as? NSNumber)?.intValue ?? 0
        fileHash = (dict["fileHash"] as? String) ?? ""
        comments = ((dict["comments"] as? [NSDictionary]) ?? []).map { ReaderComment($0) }
    }

    /// Roots and replies alike — what the sheet header counts.
    var totalCount: Int {
        return comments.reduce(0) { $0 + 1 + $1.replies.count }
    }
}

/// What the sheet is currently about.
///
/// A thread opened from the gutter is followed by its anchor key. A draft has
/// no key yet — the store mints `pending:…` locally and swaps in the server's
/// key when the write lands, so following the key would lose the sheet mid
/// post. A draft is matched on page and passage instead, which is the same
/// rule `addComment` uses to decide whether a comment joins an open thread.
enum SheetTarget {
    case thread(anchorKey: String)
    case draft(page: Int, anchorText: String, bounds: [NormalizedRect], fileHash: String)

    func resolve(in threads: [ReaderThread]) -> ReaderThread? {
        switch self {
        case .thread(let anchorKey):
            return threads.first { $0.anchorKey == anchorKey }
        case .draft(let page, let anchorText, _, _):
            return threads.first { $0.page == page && $0.anchorText == anchorText }
        }
    }

    func page(in threads: [ReaderThread]) -> Int {
        switch self {
        case .thread:
            return resolve(in: threads)?.page ?? 0
        case .draft(let page, _, _, _):
            return page
        }
    }

    func anchorText(in threads: [ReaderThread]) -> String {
        switch self {
        case .thread:
            return resolve(in: threads)?.anchorText ?? ""
        case .draft(_, let anchorText, _, _):
            return anchorText
        }
    }
}

/// "2h ago" — mirrors src/utils/relativeTime.js, including its deliberate
/// coarseness past a week.
func readerRelativeTime(_ millis: Double) -> String {
    guard millis > 0 else {
        return "not opened yet"
    }

    let seconds = max(0, Int((Date().timeIntervalSince1970 * 1000 - millis) / 1000))
    if seconds < 60 {
        return "just now"
    }

    let minutes = seconds / 60
    if minutes < 60 {
        return "\(minutes)m ago"
    }

    let hours = minutes / 60
    if hours < 24 {
        return "\(hours)h ago"
    }

    let days = hours / 24
    if days == 1 {
        return "yesterday"
    }
    if days < 7 {
        return "\(days)d ago"
    }

    let formatter = DateFormatter()
    formatter.setLocalizedDateFormatFromTemplate("d MMM")
    return formatter.string(from: Date(timeIntervalSince1970: millis / 1000))
}
