//
//  WidgetFaces13.swift
//  ReadPandaWidget
//
//  The turn-13 faces (WIDGETS_13a_13f.md): small continue (13a), small room
//  deadline (13b), medium shelf (13c), large tonight (13d), medium between
//  books (13e), StandBy, and the empty faces they fall back to. The Lock
//  Screen faces (13f) are in LockScreenFaces.swift.
//
//  Covers and bars have fixed frames; only text responds to Dynamic Type, and
//  titles truncate rather than push anything around.
//

import SwiftUI
import WidgetKit

/// A 2:3 cover at a fixed size, radius 8–10, falling back to the book's
/// duotone.
struct BookCover: View {
    let file: String?
    let duotone: [String]?
    let title: String
    let width: CGFloat
    let height: CGFloat
    var radius: CGFloat = 8

    var body: some View {
        CoverArt(file: file, duotone: duotone, title: title, titleSize: width >= 60 ? 10 : 7)
            .frame(width: width, height: height)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .accessibilityHidden(true)
    }
}

extension BookCover {
    init(book: WidgetBook, width: CGFloat, height: CGFloat, radius: CGFloat = 8) {
        self.init(file: book.coverFile, duotone: book.duotone, title: book.title, width: width, height: height, radius: radius)
    }

    init(book: BucketBook, width: CGFloat, height: CGFloat, radius: CGFloat = 8) {
        self.init(file: book.coverFile, duotone: book.duotone, title: book.title, width: width, height: height, radius: radius)
    }
}

private extension Text {
    func title(_ size: CGFloat) -> some View {
        self.font(WTheme.font(WTheme.extraBold, size))
            .foregroundStyle(WTheme.onSurface)
    }

    func meta(_ size: CGFloat = 11) -> some View {
        self.font(WTheme.font(WTheme.semibold, size))
            .foregroundStyle(WTheme.onSurfaceVariant)
    }

    func highlight(_ size: CGFloat = 11) -> some View {
        self.font(WTheme.font(WTheme.semibold, size))
            .foregroundStyle(WTheme.primary)
    }
}

// MARK: - 13a · Small, continue

struct ContinueSmallFace: View {
    let book: WidgetBook
    let streak: Int
    let pace: Double?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                BookCover(book: book, width: 42, height: 62)
                Spacer(minLength: 4)
                StreakFlame(days: streak, minimum: 1)
            }
            Spacer(minLength: 6)
            Text(book.title)
                .title(13)
                .lineLimit(1)
            Text(WidgetCopy.smallMeta(book, pace: pace))
                .meta()
                .lineLimit(1)
                .contentTransition(.numericText())
                .padding(.top, 2)
            ProgressTrack(fraction: book.fraction, height: 4)
                .padding(.top, 8)
        }
        .padding(14)
    }
}

// MARK: - 13b · Small, room deadline

struct RoomDeadlineFace: View {
    let deadline: Deadline

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Eyebrow(text: deadline.room.name)
            Spacer(minLength: 4)
            hero
            Text(WidgetCopy.deadlineLine(deadline))
                .meta()
                .lineLimit(2)
                .padding(.top, 4)
            Spacer(minLength: 6)
            ProgressTrack(fraction: deadline.barFraction, tick: Deadline.tickPosition, height: 4)
        }
        .padding(14)
    }

    @ViewBuilder
    private var hero: some View {
        if case .daysLeft = deadline.status {
            Text(WidgetCopy.deadlineHero(deadline))
                .title(30)
                .tracking(-0.6)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .contentTransition(.numericText())
        } else {
            // The states are sentences, not a count — smaller, and two lines.
            Text(WidgetCopy.deadlineHero(deadline))
                .title(17)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
        }
    }
}

/// 13b before a room has a schedule: the room's pace, not a countdown.
struct RoomPaceFace: View {
    let book: WidgetBook
    let room: WidgetRoom

    var body: some View {
        let copy = WidgetCopy.roomPace(room, book: book)
        SmallHeroLayout(
            eyebrow: room.name,
            hero: copy.hero,
            heroIsCount: copy.isCount,
            line: copy.line,
            fraction: book.fraction,
            tick: medianFraction
        )
    }

    private var medianFraction: Double? {
        guard let median = room.medianPage, book.pageCount > 0 else {
            return nil
        }
        return median / Double(book.pageCount)
    }
}

/// 13b for a book with no room: pace copy in the hero, as the shared rules
/// ask of solo books.
struct SoloPaceFace: View {
    let book: WidgetBook
    let pace: Double?

    var body: some View {
        let copy = WidgetCopy.soloHero(book, pace: pace)
        SmallHeroLayout(eyebrow: "Reading solo", hero: copy.hero, heroIsCount: true, line: copy.line, fraction: book.fraction)
    }
}

/// 13b's shape: eyebrow, a big number (or a short sentence), a line, a bar.
struct SmallHeroLayout: View {
    let eyebrow: String
    let hero: String
    let heroIsCount: Bool
    let line: String
    let fraction: Double
    var tick: Double?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Eyebrow(text: eyebrow)
            Spacer(minLength: 4)
            if heroIsCount {
                Text(hero)
                    .title(30)
                    .tracking(-0.6)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .contentTransition(.numericText())
            } else {
                Text(hero)
                    .title(17)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
            }
            Text(line)
                .meta()
                .lineLimit(2)
                .padding(.top, 4)
            Spacer(minLength: 6)
            ProgressTrack(fraction: fraction, tick: tick, height: 4)
        }
        .padding(14)
    }
}

// MARK: - 13c · Medium, shelf

struct ShelfFace: View {
    /// In progress, most recently opened first. Three are shown; the eyebrow
    /// counts them all.
    let books: [WidgetBook]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(text: "Reading · \(books.count)")
            HStack(alignment: .top, spacing: 10) {
                ForEach(books.prefix(3), id: \.id) { book in
                    Link(destination: WidgetLink.reader(book) ?? WidgetLink.library!) {
                        cell(book)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                ForEach(0..<max(0, 3 - books.count), id: \.self) { _ in
                    Color.clear.frame(maxWidth: .infinity)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func cell(_ book: WidgetBook) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            BookCover(book: book, width: 44, height: 66)
            Text(book.title)
                .font(WTheme.font(WTheme.bold, 10.5))
                .foregroundStyle(WTheme.onSurface)
                .lineLimit(2)
                .padding(.top, 5)
            Spacer(minLength: 2)
            HStack(spacing: 6) {
                Text(book.started ? "p. \(book.currentPage)" : "New")
                    .meta(9.5)
                    .lineLimit(1)
                    .fixedSize()
                    .contentTransition(.numericText())
                ProgressTrack(fraction: book.fraction, height: 3)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

// MARK: - 13d · Large, tonight

struct TonightFace: View {
    let book: WidgetBook
    let room: WidgetRoom?
    let deadline: Deadline?
    let upNext: (source: WidgetBucket, books: [BucketBook])?
    let pace: Double?
    let date: Date

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Link(destination: WidgetLink.reader(book) ?? WidgetLink.library!) {
                TonightBookSection(book: book, eyebrow: "Tonight's chapter", line: soloLine)
            }

            if let room {
                Link(destination: WidgetLink.reader(book, room: room) ?? WidgetLink.library!) {
                    roomPanel(room)
                }
            }

            Spacer(minLength: 0)

            if let upNext {
                Link(destination: WidgetLink.bucket(upNext.source) ?? WidgetLink.library!) {
                    UpNextSection(source: upNext.source, books: upNext.books)
                }
            }
        }
        .padding(16)
    }

    /// A solo book shows pace copy where the room layer would be.
    private var soloLine: String? {
        room == nil ? WidgetCopy.soloPace(book, pace: pace) : nil
    }

    private func roomPanel(_ room: WidgetRoom) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text("With \(room.name)")
                    .title(13)
                    .lineLimit(1)
                Spacer(minLength: 8)
                if let deadline {
                    Text(WidgetCopy.target(deadline, now: date))
                        .font(WTheme.font(WTheme.bold, 11))
                        .foregroundStyle(WTheme.onSurfaceVariant)
                        .lineLimit(1)
                        .fixedSize()
                }
            }
            Text(WidgetCopy.roomCommentsLine(room, book: book))
                .meta()
                .lineLimit(1)
                .contentTransition(.numericText())
            // Only from comments the reader has unlocked (the app never has
            // the others), so this can't spoil.
            if let snippet = room.snippet {
                Text("\(snippet.author): \(snippet.text)")
                    .highlight(12)
                    .lineLimit(2)
                    .padding(.top, 2)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(WTheme.panel))
    }
}

/// 13d's top section, also StandBy's face: cover, eyebrow, title, one line,
/// bar.
struct TonightBookSection: View {
    let book: WidgetBook
    let eyebrow: String
    var line: String?
    var coverWidth: CGFloat = 72

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            BookCover(book: book, width: coverWidth, height: coverWidth * 1.47, radius: 10)
            VStack(alignment: .leading, spacing: 0) {
                Eyebrow(text: eyebrow)
                Text(book.title)
                    .title(17)
                    .tracking(-0.3)
                    .lineLimit(2)
                    .padding(.top, 5)
                Text(WidgetCopy.longMeta(book))
                    .meta()
                    .lineLimit(1)
                    .contentTransition(.numericText())
                    .padding(.top, 3)
                if let line {
                    Text(line)
                        .highlight()
                        .lineLimit(1)
                        .padding(.top, 6)
                }
                Spacer(minLength: 6)
                ProgressTrack(fraction: book.fraction, height: 5)
            }
            .frame(height: coverWidth * 1.47)
        }
    }
}

/// "Up next · [Bucket]" and four covers.
struct UpNextSection: View {
    let source: WidgetBucket
    let books: [BucketBook]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Eyebrow(text: "Up next · \(source.name)")
            HStack(spacing: 10) {
                ForEach(books.prefix(4)) { book in
                    BookCover(book: book, width: 38, height: 56)
                }
                Spacer(minLength: 0)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Up next from \(source.name): \(books.prefix(4).map(\.title).joined(separator: ", "))")
    }
}

// MARK: - 13e · Medium, between books

struct BetweenBooksFace: View {
    let finished: LastFinished
    let label: String
    let picks: [BucketBook]
    let date: Date

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Eyebrow(text: finished.date.map { WidgetCopy.finished($0, now: date) } ?? "Finished")
                Spacer(minLength: 8)
                Text(label)
                    .font(WTheme.font(WTheme.bold, 10))
                    .foregroundStyle(WTheme.primary)
                    .lineLimit(1)
            }
            // The title gives way first; the question always fits.
            HStack(spacing: 0) {
                Text(finished.title)
                    .title(15)
                    .lineLimit(1)
                Text(" is done. What's next?")
                    .title(15)
                    .lineLimit(1)
                    .fixedSize()
                    .layoutPriority(1)
            }
            .padding(.top, 6)

            Spacer(minLength: 8)

            HStack(alignment: .top, spacing: 12) {
                ForEach(picks) { book in
                    Link(destination: WidgetLink.bookDetail(book) ?? WidgetLink.library!) {
                        HStack(alignment: .top, spacing: 8) {
                            BookCover(book: book, width: 40, height: 58)
                            Text(book.title)
                                .font(WTheme.font(WTheme.bold, 10.5))
                                .foregroundStyle(WTheme.onSurface)
                                .lineLimit(3)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                ForEach(0..<max(0, 3 - picks.count), id: \.self) { _ in
                    Color.clear.frame(maxWidth: .infinity)
                }
            }
        }
        .padding(16)
    }
}

// MARK: - StandBy

/// StandBy reuses 13d's top section. At night the system tints the widget
/// red and renders it vibrant; the copy turns to bedtime then, and the tint
/// is left entirely to the system.
struct StandByFace: View {
    let book: WidgetBook
    let pace: Double?
    let night: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                BookCover(book: book, width: 44, height: 65)
                Spacer(minLength: 4)
            }
            Spacer(minLength: 6)
            Eyebrow(text: night ? "Bedtime" : "Tonight's chapter")
            Text(night ? "One more chapter?" : book.title)
                .title(15)
                .lineLimit(2)
                .padding(.top, 3)
            Text(night ? WidgetCopy.bedtimeLine(book, pace: pace) : WidgetCopy.longMeta(book))
                .meta()
                .lineLimit(1)
                .contentTransition(.numericText())
                .padding(.top, 2)
        }
        .padding(14)
    }
}

// MARK: - Empty faces

/// No book on the go: a small "Start a book".
struct StartSmallFace: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Image("PandaMark")
                .resizable()
                .scaledToFit()
                .frame(width: 48, height: 48)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .accessibilityHidden(true)
            Spacer(minLength: 6)
            Text("Start a book")
                .title(14)
                .lineLimit(1)
            Text("Pick one and it lives here.")
                .highlight()
                .lineLimit(2)
                .padding(.top, 2)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

/// No book on the go, large: the medium empty face, and Curated to start
/// from.
struct StartLargeFace: View {
    let curated: WidgetBucket?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Link(destination: WidgetLink.library!) {
                StartReadingFace()
            }
            Spacer(minLength: 0)
            if let curated, !(curated.books ?? []).isEmpty {
                Link(destination: WidgetLink.bucket(curated) ?? WidgetLink.library!) {
                    UpNextSection(source: curated, books: Array((curated.books ?? []).prefix(4)))
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 16)
            }
        }
    }
}
