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

    // MARK: - Turn 13 (WIDGETS_13a_13f.md)

    /// Local calendar days from one date to another — so a countdown changes
    /// at midnight, never mid-evening. Negative when `to` is earlier.
    static func calendarDays(from: Date, to: Date) -> Int? {
        Calendar.current.dateComponents(
            [.day],
            from: Calendar.current.startOfDay(for: from),
            to: Calendar.current.startOfDay(for: to)
        ).day
    }

    /// "Ch. 4" for a book with chapters, "p. 120" for one without.
    static func place(_ book: WidgetBook, page: Int) -> String {
        if let chapter = book.chapter(atPage: page) {
            return "Ch. \(chapter)"
        }
        return "p. \(page)"
    }

    /// Reading time for some pages at the reader's pace: "40 min", "3 h".
    static func duration(pages: Int, pace: Double) -> String {
        let minutes = max(1, Int((Double(pages) * pace).rounded()))
        if minutes < 60 {
            return "\(minutes) min"
        }
        return "\(Int((Double(minutes) / 60).rounded())) h"
    }

    /// "3 h left" / "40 min left" at the reader's pace, or "4%" before there's
    /// any pace to go on.
    static func timeLeft(_ book: WidgetBook, pace: Double?) -> String {
        guard let pace, pace > 0, book.started else {
            return "\(book.percent)%"
        }
        let remaining = max(0, book.pageCount - book.currentPage)
        if remaining == 0 {
            return "Last page"
        }
        return "\(duration(pages: remaining, pace: pace)) left"
    }

    /// 13a's meta line: "Page 31 · 3 h left".
    static func smallMeta(_ book: WidgetBook, pace: Double?) -> String {
        guard book.started else {
            return "Not started yet"
        }
        return "Page \(book.currentPage) · \(timeLeft(book, pace: pace))"
    }

    /// 13d's meta line: "Ch. 2 · Page 31 of 746".
    static func longMeta(_ book: WidgetBook) -> String {
        guard book.started else {
            return "Not started yet"
        }
        let pages = "Page \(book.currentPage) of \(book.pageCount)"
        if let chapter = book.currentChapter {
            return "Ch. \(chapter) · \(pages)"
        }
        return pages
    }

    /// A solo book's pace line, in place of the room layer: "~14 min per
    /// chapter" when the book has chapters, "3 h left" otherwise.
    static func soloPace(_ book: WidgetBook, pace: Double?) -> String? {
        guard let pace, pace > 0, book.started else {
            return nil
        }
        if let pages = book.averageChapterPages {
            return "~\(duration(pages: Int(pages.rounded()), pace: pace)) per chapter"
        }
        return timeLeft(book, pace: pace)
    }

    /// "3 days", "1 day".
    static func days(_ n: Int) -> String {
        n == 1 ? "1 day" : "\(n) days"
    }

    /// When a room's target is due: the weekday within the week ("Fri"),
    /// the date beyond it ("Oct 12").
    static func due(_ date: Date, from now: Date) -> String {
        let days = calendarDays(from: now, to: date) ?? 0
        if days == 0 {
            return "today"
        }
        if days == 1 {
            return "tomorrow"
        }
        let formatter = DateFormatter()
        formatter.setLocalizedDateFormatFromTemplate(days > 0 && days < 7 ? "EEE" : "MMMd")
        return formatter.string(from: date)
    }

    /// "Ch. 4 by Fri".
    static func target(_ deadline: Deadline, now: Date) -> String {
        "\(deadline.targetLabel) by \(due(deadline.schedule.dueDate, from: now))"
    }

    /// 13b's line under the hero, for each state. Never shaming, never red.
    static func deadlineLine(_ deadline: Deadline) -> String {
        let book = deadline.book
        let you = place(book, page: book.currentPage)
        switch deadline.status {
        case .ahead:
            return "You're past \(deadline.targetLabel). The room's still getting there."
        case .dueToday, .daysLeft:
            let verb = book.hasChapters ? "finish" : "reach"
            return "to \(verb) \(deadline.targetLabel). You're on \(you)."
        case .overdue:
            return "You're on \(you). Pick up whenever you're ready."
        }
    }

    /// 13b's hero for each state.
    static func deadlineHero(_ deadline: Deadline) -> String {
        switch deadline.status {
        case .ahead:
            return "Ahead of the room"
        case .dueToday:
            return "Due today"
        case .daysLeft(let n):
            return days(n)
        case .overdue:
            return "Room moved on to \(movedOnTo(deadline))"
        }
    }

    /// Where the room went after a target the reader didn't reach.
    private static func movedOnTo(_ deadline: Deadline) -> String {
        let book = deadline.book
        if let chapter = book.chapter(atPage: deadline.schedule.target) {
            return "Ch. \(chapter + 1)"
        }
        return "p. \(deadline.schedule.target + 1)"
    }

    /// 13b with a room but no schedule: the room's pace takes the hero.
    /// Someone ahead → the gap; you ahead of everyone → the lead; nobody's
    /// pace known → waiting comments; otherwise just where you are.
    static func roomPace(_ room: WidgetRoom, book: WidgetBook) -> (hero: String, line: String, isCount: Bool) {
        let you = place(book, page: book.currentPage)
        if let friend = book.friendAhead ?? room.leader, friend.pages > 0 {
            return (pages(friend.pages), "behind \(friend.name). You're on \(you).", true)
        }
        if room.medianPage != nil {
            return ("In the lead", "You're on \(you). The room's behind you.", false)
        }
        if room.waiting > 0 {
            let noun = room.waiting == 1 ? "comment" : "comments"
            return ("\(room.waiting) new", "\(noun) up to p. \(book.currentPage)", true)
        }
        return (you, "with the room. Comments unlock as you read.", true)
    }

    /// 13b for a solo book: the time left takes the hero, or the percentage
    /// before there's any pace.
    static func soloHero(_ book: WidgetBook, pace: Double?) -> (hero: String, line: String) {
        let you = "You're on \(place(book, page: book.currentPage))."
        if let pace, pace > 0, book.started, book.currentPage < book.pageCount {
            return (duration(pages: book.pageCount - book.currentPage, pace: pace), "left in \(book.title). \(you)")
        }
        return ("\(book.percent)%", "through \(book.title). \(you)")
    }

    /// 13d's room line: "3 waiting · up to p. 31".
    static func roomCommentsLine(_ room: WidgetRoom, book: WidgetBook) -> String {
        let page = "up to p. \(book.currentPage)"
        switch room.waiting {
        case 0:
            return "No new comments \(page)"
        case 1:
            return "1 new comment \(page)"
        default:
            return "\(room.waiting) new comments \(page)"
        }
    }

    /// 13e's eyebrow: "Finished today" / "yesterday" / "Monday".
    static func finished(_ date: Date, now: Date) -> String {
        switch calendarDays(from: date, to: now) ?? 0 {
        case ...0:
            return "Finished today"
        case 1:
            return "Finished yesterday"
        default:
            let formatter = DateFormatter()
            formatter.setLocalizedDateFormatFromTemplate("EEEE")
            return "Finished \(formatter.string(from: date))"
        }
    }

    /// StandBy at night: "Ch. 3 is about 25 min", from pace.
    static func bedtimeLine(_ book: WidgetBook, pace: Double?) -> String {
        if let chapter = book.currentChapter, let range = book.pages(ofChapter: chapter) {
            let left = max(1, range.upperBound - book.currentPage + 1)
            if let pace, pace > 0 {
                return "Ch. \(chapter) is about \(duration(pages: left, pace: pace))"
            }
            return "Ch. \(chapter) · \(pages(left)) to go"
        }
        if let pace, pace > 0 {
            return "20 pages is about \(duration(pages: 20, pace: pace))"
        }
        return "Page \(book.currentPage) of \(book.pageCount)"
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
