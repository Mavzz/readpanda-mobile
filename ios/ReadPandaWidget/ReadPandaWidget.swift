//
//  ReadPandaWidget.swift
//  ReadPandaWidget
//
//  The medium widget (WIDGET_5a_5b.md). One widget, two faces: the user picks
//  "Continue reading" or "Room pulse" in the widget's settings, and can pin a
//  room for the second. Configuration is an App Intent, so this needs iOS 17.
//
//  Refresh: the app reloads timelines whenever it writes new state (progress
//  saves, backgrounding, new comments). Between those, hourly entries keep the
//  time-aware copy honest ("Tonight's chapter" shouldn't still say so at 9am).
//

import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Configuration

enum WidgetFace: String, AppEnum {
    case continueReading
    case roomPulse

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Face"
    static var caseDisplayRepresentations: [WidgetFace: DisplayRepresentation] = [
        .continueReading: "Continue reading",
        .roomPulse: "Room pulse",
    ]
}

struct RoomEntity: AppEntity {
    let id: String
    let name: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Room"
    static var defaultQuery = RoomQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

/// The rooms the app last wrote — pinning offers exactly what the widget can show.
struct RoomQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [RoomEntity] {
        allRooms().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [RoomEntity] {
        allRooms()
    }

    private func allRooms() -> [RoomEntity] {
        (WidgetState.load().rooms ?? []).map { RoomEntity(id: $0.id, name: $0.name) }
    }
}

struct ReadPandaWidgetIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "ReadPanda"
    static var description = IntentDescription("Your book, or your room's latest.")

    @Parameter(title: "Show", default: .continueReading)
    var face: WidgetFace

    /// Room pulse only. Left empty, it follows the room with the most waiting
    /// comments.
    @Parameter(title: "Room")
    var room: RoomEntity?

    static var parameterSummary: some ParameterSummary {
        When(\.$face, .equalTo, .roomPulse) {
            Summary("Show \(\.$face) for \(\.$room)")
        } otherwise: {
            Summary("Show \(\.$face)")
        }
    }
}

// MARK: - Timeline

struct ReadPandaEntry: TimelineEntry {
    let date: Date
    let state: WidgetState
    let face: WidgetFace
    let pinnedRoomId: String?
}

struct ReadPandaProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> ReadPandaEntry {
        ReadPandaEntry(date: .now, state: .sample, face: .continueReading, pinnedRoomId: nil)
    }

    func snapshot(for configuration: ReadPandaWidgetIntent, in context: Context) async -> ReadPandaEntry {
        // The widget gallery shows real data when there is some, and the
        // sample otherwise, so the preview never looks broken.
        let state = WidgetState.load()
        let shown = context.isPreview && state.currentBook == nil ? .sample : state
        return ReadPandaEntry(date: .now, state: shown, face: configuration.face, pinnedRoomId: configuration.room?.id)
    }

    func timeline(for configuration: ReadPandaWidgetIntent, in context: Context) async -> Timeline<ReadPandaEntry> {
        let state = WidgetState.load()
        let now = Date()
        // Now, then the top of each of the next six hours.
        let hours = (1...6).compactMap { offset -> Date? in
            let next = Calendar.current.date(byAdding: .hour, value: offset, to: now)
            return next.flatMap { Calendar.current.dateInterval(of: .hour, for: $0)?.start }
        }
        let entries = ([now] + hours).map {
            ReadPandaEntry(date: $0, state: state, face: configuration.face, pinnedRoomId: configuration.room?.id)
        }
        return Timeline(entries: entries, policy: .atEnd)
    }
}

// MARK: - View

struct ReadPandaWidgetView: View {
    let entry: ReadPandaEntry

    var body: some View {
        content
            .containerBackground(for: .widget) { WTheme.background }
    }

    @ViewBuilder
    private var content: some View {
        let state = entry.state
        if entry.face == .roomPulse, let room = state.pulseRoom(pinnedId: entry.pinnedRoomId) {
            RoomPulseFace(room: room)
                .widgetURL(URL(string: "readpanda://room/\(encoded(room.id))"))
        } else if let book = state.currentBook {
            // Room pulse with no rooms falls back to the book rather than an
            // empty card.
            ContinueReadingFace(book: book, streak: state.streakDays, date: entry.date)
                .widgetURL(URL(string: "readpanda://read/\(encoded(book.id))?page=\(max(0, book.currentPage - 1))"))
        } else {
            StartReadingFace()
                .widgetURL(URL(string: "readpanda://library"))
        }
    }

    private func encoded(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? value
    }
}

@main
struct ReadPandaWidget: Widget {
    let kind = "ReadPandaWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ReadPandaWidgetIntent.self, provider: ReadPandaProvider()) { entry in
            ReadPandaWidgetView(entry: entry)
        }
        .configurationDisplayName("ReadPanda")
        .description("Pick up your book, or see what your room is saying.")
        .supportedFamilies([.systemMedium])
        // The cover bleeds to the left edge; each face pads itself.
        .contentMarginsDisabled()
    }
}

// MARK: - Sample (gallery preview and placeholder)

extension WidgetState {
    static let sample = WidgetState(
        currentBook: WidgetBook(
            id: "sample",
            title: "Data Mining",
            page: 31,
            totalPages: 746,
            lastReadAt: Date().timeIntervalSince1970 * 1000,
            roomId: "sample-room",
            coverFile: nil,
            duotone: ["#2e3a54", "#151d32"],
            friendAhead: FriendAhead(name: "Grace", pagesAhead: 24)
        ),
        streak: 6,
        rooms: [
            WidgetRoom(
                id: "sample-room",
                name: "AI Learning",
                bookId: "sample",
                bookTitle: "Data Mining",
                coverFile: nil,
                duotone: ["#2e3a54", "#151d32"],
                memberInitials: ["G", "M", "R"],
                unlockedUnreadCount: 3,
                teaser: Teaser(author: "Grace", text: "page 29 gets wild…"),
                myPage: 31,
                medianPage: 118,
                totalPages: 746,
                lastActivityAt: nil,
                leader: FriendAhead(name: "Grace", pagesAhead: 24)
            ),
        ],
        updatedAt: nil
    )
}

#Preview(as: .systemMedium) {
    ReadPandaWidget()
} timeline: {
    ReadPandaEntry(date: .now, state: .sample, face: .continueReading, pinnedRoomId: nil)
    ReadPandaEntry(date: .now, state: .sample, face: .roomPulse, pinnedRoomId: nil)
    ReadPandaEntry(date: .now, state: .empty, face: .continueReading, pinnedRoomId: nil)
}
