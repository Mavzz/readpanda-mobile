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
//  Between books (WIDGETS_13a_13f.md 13e) replaces 5a for three days after a
//  book is finished, when nothing else is on the go.
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
        // Explicit root: older Swift compilers (CI's Xcode) can't infer it.
        When(\ReadPandaWidgetIntent.$face, .equalTo, .roomPulse) {
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
        let shown = context.isPreview && state.shelf.isEmpty ? .sample : state
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
                .widgetURL(WidgetLink.room(room))
        } else if let book = state.currentBook {
            // Room pulse with no rooms falls back to the book rather than an
            // empty card.
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
}

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

#Preview(as: .systemMedium) {
    ReadPandaWidget()
} timeline: {
    ReadPandaEntry(date: .now, state: .sample, face: .continueReading, pinnedRoomId: nil)
    ReadPandaEntry(date: .now, state: .sample, face: .roomPulse, pinnedRoomId: nil)
    ReadPandaEntry(date: .now, state: .sampleBetweenBooks, face: .continueReading, pinnedRoomId: nil)
    ReadPandaEntry(date: .now, state: .empty, face: .continueReading, pinnedRoomId: nil)
}
