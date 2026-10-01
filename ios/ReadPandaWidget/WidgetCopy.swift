//
//  WidgetCopy.swift
//  ReadPandaWidget
//
//  Every sentence the widget says, in one place. The rules (WIDGET_5a_5b.md):
//  time-aware, one warm sentence at most, and never a raw number without a
//  sentence around it. Pages rather than chapters — the reader knows pages.
//

import Foundation

enum WidgetCopy {

    /// The eyebrow. A gap of more than 48h outranks the time of day.
    static func eyebrow(at date: Date, lastReadAt: Double?) -> String {
        if let days = daysSince(lastReadAt, at: date), days >= 2 {
            return "It's been \(days) days"
        }
        switch Calendar.current.component(.hour, from: date) {
        case 5..<11:
            return "Pick up where you left off"
        case 11..<17:
            return "Your book is waiting"
        default:
            return "Tonight's chapter"
        }
    }

    static func meta(for book: WidgetBook) -> String {
        guard book.pageCount > 0 else {
            return "Not started yet"
        }
        return "Page \(book.currentPage) of \(book.pageCount)"
    }

    /// 5a's warm line. Room books tie progress to a person; solo books would
    /// get pace copy, but the app doesn't record reading speed yet, so they
    /// get nothing rather than a guess.
    static func warmLine(for book: WidgetBook, at date: Date) -> String? {
        guard let friend = book.friendAhead, friend.pages > 0 else {
            return nil
        }
        let gap = daysSince(book.lastReadAt, at: date) ?? 0
        if gap >= 2 {
            return "\(friend.name) missed you — \(pages(friend.pages)) ahead now"
        }
        return "\(friend.name) is \(pages(friend.pages)) ahead — catch up \(when(date))"
    }

    /// 5b's hook. Counts only comments the reader has reached, and the teaser
    /// is taken from one of those, so it can't spoil.
    static func hook(for room: WidgetRoom) -> String {
        let waiting = room.waiting
        if waiting > 0 {
            let lead = "\(waiting) \(waiting == 1 ? "comment" : "comments") waiting where you left off"
            if let teaser = room.teaser, !teaser.text.isEmpty {
                return "\(lead) — \(teaser.author) says \(teaser.text)"
            }
            return lead
        }
        if let leader = room.leader, leader.pages > 0 {
            return "You're caught up — \(leader.name) is \(pages(leader.pages)) ahead"
        }
        return "You're caught up with everyone"
    }

    static func pages(_ n: Int) -> String {
        n == 1 ? "1 page" : "\(n) pages"
    }

    static func when(_ date: Date) -> String {
        let hour = Calendar.current.component(.hour, from: date)
        return (hour >= 17 || hour < 5) ? "tonight" : "today"
    }

    private static func daysSince(_ millis: Double?, at date: Date) -> Int? {
        guard let millis, millis > 0 else {
            return nil
        }
        let last = Date(timeIntervalSince1970: millis / 1000)
        return Calendar.current.dateComponents(
            [.day],
            from: Calendar.current.startOfDay(for: last),
            to: Calendar.current.startOfDay(for: date)
        ).day
    }
}
