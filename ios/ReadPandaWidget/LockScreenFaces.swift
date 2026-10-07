//
//  LockScreenFaces.swift
//  ReadPandaWidget
//
//  13f: the Lock Screen widgets. The system renders these monochrome, so the
//  meaning is carried by shape — a gauge, a line of weight — never by colour.
//  System fonts, so they match the clock and the other accessories.
//

import SwiftUI
import WidgetKit

struct LockScreenFace: View {
    @Environment(\.widgetFamily) private var family

    let state: WidgetState
    let book: WidgetBook?
    let room: WidgetRoom?
    let deadline: Deadline?

    var body: some View {
        if let book {
            switch family {
            case .accessoryInline:
                inline(book)
            case .accessoryCircular:
                circular(book)
            default:
                rectangular(book)
            }
        } else {
            empty
        }
    }

    // "📖 Data Mining · p. 31"
    private func inline(_ book: WidgetBook) -> some View {
        Label {
            Text(book.started ? "\(book.title) · p. \(book.currentPage)" : book.title)
        } icon: {
            Image(systemName: "book")
        }
    }

    // Progress through the current chapter, "Ch.2" in the middle. A book
    // without chapters shows the whole book and its percentage.
    private func circular(_ book: WidgetBook) -> some View {
        Gauge(value: book.chapterFraction ?? book.fraction) {
            Image(systemName: "book")
        } currentValueLabel: {
            Text(book.currentChapter.map { "Ch.\($0)" } ?? "\(book.percent)%")
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .minimumScaleFactor(0.6)
                .contentTransition(.numericText())
        }
        .gaugeStyle(.accessoryCircularCapacity)
        .widgetAccentable()
        .accessibilityLabel(book.title)
    }

    private func rectangular(_ book: WidgetBook) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(room?.name ?? book.title)
                .font(.system(size: 15, weight: .heavy))
                .lineLimit(1)
                .widgetAccentable()
            Text(secondLine(book))
                .font(.system(size: 13, weight: .medium))
                .lineLimit(1)
                .contentTransition(.numericText())
            Gauge(value: gaugeValue(book)) {
                EmptyView()
            }
            .gaugeStyle(.accessoryLinearCapacity)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// "Ch. 4 by Fri · 3 waiting" with a room; "Ch. 2 · 3 h left" solo.
    private func secondLine(_ book: WidgetBook) -> String {
        let now = Date()
        if let room {
            var parts: [String] = []
            if let deadline {
                parts.append(WidgetCopy.target(deadline, now: now))
            } else {
                parts.append(WidgetCopy.place(book, page: book.currentPage))
            }
            if room.waiting > 0 {
                parts.append("\(room.waiting) waiting")
            }
            return parts.joined(separator: " · ")
        }
        guard book.started else {
            return "Not started yet"
        }
        return "\(WidgetCopy.place(book, page: book.currentPage)) · \(WidgetCopy.timeLeft(book, pace: state.paceMinPerPage))"
    }

    /// The room target with one, the whole book without.
    private func gaugeValue(_ book: WidgetBook) -> Double {
        guard let schedule = deadline?.schedule else {
            return book.fraction
        }
        let span = Double(max(1, schedule.target - schedule.start + 1))
        return min(1, max(0, Double(book.currentPage - schedule.start + 1) / span))
    }

    @ViewBuilder
    private var empty: some View {
        switch family {
        case .accessoryInline:
            Label("Start a book", systemImage: "book")
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "book")
                    .font(.system(size: 20, weight: .semibold))
            }
            .accessibilityLabel("Start a book")
        default:
            VStack(alignment: .leading, spacing: 2) {
                Text("ReadPanda")
                    .font(.system(size: 15, weight: .heavy))
                    .widgetAccentable()
                Text("Start a book")
                    .font(.system(size: 13, weight: .medium))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
