//
//  Widgets13.swift
//  ReadPandaWidget
//
//  The turn-13 widget family (WIDGETS_13a_13f.md), and the bundle that ships
//  it beside 5a/5b.
//
//  Timeline: the app reloads every widget whenever it writes new state — a
//  progress save, a room schedule changing, a comment unlocking. Between
//  those, one refresh at local midnight moves the day countdowns and 13e's
//  three-day window on.
//

import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Bundle

@main
struct ReadPandaWidgets: WidgetBundle {
    var body: some Widget {
        ReadPandaWidget()
        ContinueSmallWidget()
        RoomDeadlineWidget()
        ShelfWidget()
        TonightWidget()
        LockScreenWidget()
    }
}

// MARK: - Timeline

enum WidgetTimeline {
    /// Now, and the next local midnight.
    static func dates(from now: Date) -> [Date] {
        let midnight = Calendar.current.nextDate(
            after: now,
            matching: DateComponents(hour: 0, minute: 0, second: 0),
            matchingPolicy: .nextTime
        )
        return [now] + (midnight.map { [$0] } ?? [])
    }

    /// The real state, or the sample in the gallery when there's nothing yet,
    /// so a preview never looks broken.
    static func state(preview: Bool) -> WidgetState {
        let state = WidgetState.load()
        return preview && state.shelf.isEmpty ? .sample : state
    }
}

struct BookEntry: TimelineEntry {
    let date: Date
    let state: WidgetState
    let pin: BookPin
    let pinnedRoomId: String?

    var book: WidgetBook? { state.book(for: pin) }
    var pace: Double? { state.paceMinPerPage }

    var deadline: Deadline? {
        book.flatMap { state.deadline(for: $0, pinnedRoom: pinnedRoomId, now: date) }
    }

    var room: WidgetRoom? {
        book.flatMap { state.room(for: $0, pinned: pinnedRoomId) }
    }
}

struct BookProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> BookEntry {
        BookEntry(date: .now, state: .sample, pin: .recent, pinnedRoomId: nil)
    }

    func snapshot(for configuration: BookWidgetIntent, in context: Context) async -> BookEntry {
        BookEntry(
            date: .now,
            state: WidgetTimeline.state(preview: context.isPreview),
            pin: configuration.pin,
            pinnedRoomId: configuration.pinnedRoomId
        )
    }

    func timeline(for configuration: BookWidgetIntent, in context: Context) async -> Timeline<BookEntry> {
        let state = WidgetState.load()
        let entries = WidgetTimeline.dates(from: .now).map {
            BookEntry(date: $0, state: state, pin: configuration.pin, pinnedRoomId: configuration.pinnedRoomId)
        }
        return Timeline(entries: entries, policy: .atEnd)
    }
}

struct ShelfEntry: TimelineEntry {
    let date: Date
    let state: WidgetState
}

struct ShelfProvider: TimelineProvider {
    func placeholder(in context: Context) -> ShelfEntry {
        ShelfEntry(date: .now, state: .sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (ShelfEntry) -> Void) {
        completion(ShelfEntry(date: .now, state: WidgetTimeline.state(preview: context.isPreview)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ShelfEntry>) -> Void) {
        let state = WidgetState.load()
        let entries = WidgetTimeline.dates(from: .now).map { ShelfEntry(date: $0, state: state) }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

// MARK: - 13a · Small, continue

/// 13a, or StandBy's face when the system shows the widget there (no
/// container background). One tap target: the reader at the saved page.
struct ContinueSmallContent: View {
    @Environment(\.showsWidgetContainerBackground) private var showsBackground
    @Environment(\.widgetRenderingMode) private var renderingMode

    let entry: BookEntry

    var body: some View {
        if let book = entry.book {
            Group {
                if showsBackground {
                    ContinueSmallFace(book: book, streak: entry.state.streakDays, pace: entry.pace)
                } else {
                    StandByFace(book: book, pace: entry.pace, night: renderingMode == .vibrant)
                }
            }
            .widgetURL(WidgetLink.reader(book))
        } else {
            StartSmallFace()
                .widgetURL(WidgetLink.library)
        }
    }
}

struct ContinueSmallWidget: Widget {
    let kind = "ReadPandaContinue"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: BookWidgetIntent.self, provider: BookProvider()) { entry in
            ContinueSmallContent(entry: entry)
                .containerBackground(for: .widget) { WTheme.background }
        }
        .configurationDisplayName("Continue reading")
        .description("Your page, and the time left in the book.")
        .supportedFamilies([.systemSmall])
        .contentMarginsDisabled()
    }
}

// MARK: - 13b · Small, room deadline

struct RoomDeadlineWidget: Widget {
    let kind = "ReadPandaRoomDeadline"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: BookWidgetIntent.self, provider: BookProvider()) { entry in
            Group {
                // The spec falls back to 13a without a deadline, but then the
                // two smalls are the same widget. So: a room without a
                // schedule shows its pace, and a solo book its time left.
                if let deadline = entry.deadline {
                    RoomDeadlineFace(deadline: deadline)
                        .widgetURL(WidgetLink.reader(deadline.book, room: deadline.room))
                } else if let book = entry.book, let room = entry.room {
                    RoomPaceFace(book: book, room: room)
                        .widgetURL(WidgetLink.reader(book, room: room))
                } else if let book = entry.book {
                    SoloPaceFace(book: book, pace: entry.pace)
                        .widgetURL(WidgetLink.reader(book))
                } else {
                    StartSmallFace()
                        .widgetURL(WidgetLink.library)
                }
            }
            .containerBackground(for: .widget) { WTheme.background }
        }
        .configurationDisplayName("Room pace")
        .description("Days until your room's next stop, or how far ahead they are.")
        .supportedFamilies([.systemSmall])
        .contentMarginsDisabled()
    }
}

// MARK: - 13c · Medium, shelf

struct ShelfWidgetView: View {
    let entry: ShelfEntry

    var body: some View {
        let state = entry.state
        let books = state.inProgress
        Group {
            if books.count >= 2 {
                ShelfFace(books: books)
            } else if let book = books.first {
                // One book: 5a's layout.
                ContinueReadingFace(book: book, streak: state.streakDays, date: entry.date)
                    .widgetURL(WidgetLink.reader(book))
            } else if let finished = state.betweenBooks(at: entry.date) {
                let picks = state.nextPicks(after: finished)
                BetweenBooksFace(finished: finished, label: picks.label, picks: picks.books, date: entry.date)
            } else {
                StartReadingFace()
                    .widgetURL(WidgetLink.library)
            }
        }
        .containerBackground(for: .widget) { WTheme.background }
    }
}

struct ShelfWidget: Widget {
    let kind = "ReadPandaShelf"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ShelfProvider()) { entry in
            ShelfWidgetView(entry: entry)
        }
        .configurationDisplayName("Shelf")
        .description("Every book you're reading, one tap from its page.")
        .supportedFamilies([.systemMedium])
        .contentMarginsDisabled()
    }
}

// MARK: - 13d · Large, tonight

struct TonightWidget: Widget {
    let kind = "ReadPandaTonight"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: BookWidgetIntent.self, provider: BookProvider()) { entry in
            Group {
                if let book = entry.book {
                    TonightFace(
                        book: book,
                        room: entry.room,
                        deadline: entry.deadline,
                        upNext: entry.state.upNext(after: book),
                        pace: entry.pace,
                        date: entry.date
                    )
                } else {
                    StartLargeFace(curated: entry.state.curated)
                }
            }
            .containerBackground(for: .widget) { WTheme.background }
        }
        .configurationDisplayName("Tonight")
        .description("Your chapter, your room, and what's up next.")
        .supportedFamilies([.systemLarge])
        .contentMarginsDisabled()
    }
}

// MARK: - 13f · Lock Screen

struct LockScreenWidget: Widget {
    let kind = "ReadPandaLockScreen"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: BookWidgetIntent.self, provider: BookProvider()) { entry in
            LockScreenFace(state: entry.state, book: entry.book, room: entry.room, deadline: entry.deadline)
                .widgetURL(entry.book.map { WidgetLink.reader($0, room: entry.room) } ?? WidgetLink.library)
                .containerBackground(for: .widget) { Color.clear }
        }
        .configurationDisplayName("ReadPanda")
        .description("Your page and your room at a glance.")
        .supportedFamilies([.accessoryInline, .accessoryCircular, .accessoryRectangular])
    }
}

// MARK: - Previews

#Preview("13a", as: .systemSmall) {
    ContinueSmallWidget()
} timeline: {
    BookEntry(date: .now, state: .sample, pin: .recent, pinnedRoomId: nil)
    BookEntry(date: .now, state: .empty, pin: .recent, pinnedRoomId: nil)
}

#Preview("13b", as: .systemSmall) {
    RoomDeadlineWidget()
} timeline: {
    BookEntry(date: .now, state: .sample, pin: .recent, pinnedRoomId: nil)
    BookEntry(date: .now, state: .sample, pin: .book("sample-2"), pinnedRoomId: nil)
}

#Preview("13c", as: .systemMedium) {
    ShelfWidget()
} timeline: {
    ShelfEntry(date: .now, state: .sample)
    ShelfEntry(date: .now, state: .sampleBetweenBooks)
}

#Preview("13d", as: .systemLarge) {
    TonightWidget()
} timeline: {
    BookEntry(date: .now, state: .sample, pin: .recent, pinnedRoomId: nil)
    BookEntry(date: .now, state: .sample, pin: .book("sample-2"), pinnedRoomId: nil)
}

#Preview("13f", as: .accessoryRectangular) {
    LockScreenWidget()
} timeline: {
    BookEntry(date: .now, state: .sample, pin: .recent, pinnedRoomId: nil)
    BookEntry(date: .now, state: .sample, pin: .book("sample-2"), pinnedRoomId: nil)
}
