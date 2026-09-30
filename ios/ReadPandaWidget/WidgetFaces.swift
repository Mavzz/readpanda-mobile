//
//  WidgetFaces.swift
//  ReadPandaWidget
//
//  The two medium faces from WIDGET_5a_5b.md, plus the empty state. Each face
//  is one tap target: the whole widget deep-links (no sub-targets on medium).
//

import SwiftUI
import WidgetKit

// MARK: - 5a · Continue reading (book-first)

struct ContinueReadingFace: View {
    let book: WidgetBook
    let streak: Int
    let date: Date

    var body: some View {
        HStack(spacing: 0) {
            // Cover bleeds the full left edge, with a soft scrim into the card.
            CoverArt(file: book.coverFile, duotone: book.duotone, title: book.title)
                .frame(width: 104)
                .frame(maxHeight: .infinity)
                .clipped()
                .overlay(
                    LinearGradient(
                        stops: [
                            .init(color: .clear, location: 0.6),
                            .init(color: WTheme.surface.opacity(0.55), location: 1),
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )

            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .firstTextBaseline) {
                    Eyebrow(text: WidgetCopy.eyebrow(at: date, lastReadAt: book.lastReadAt))
                    Spacer(minLength: 6)
                    StreakFlame(days: streak)
                }

                Text(book.title)
                    .font(WTheme.font(WTheme.extraBold, 16))
                    .tracking(-0.3)
                    .foregroundStyle(WTheme.onSurface)
                    .lineLimit(1)
                    .padding(.top, 6)

                Text(WidgetCopy.meta(for: book))
                    .font(WTheme.font(WTheme.semibold, 11))
                    .foregroundStyle(WTheme.onSurfaceVariant)
                    .lineLimit(1)
                    .padding(.top, 2)

                Spacer(minLength: 6)

                if let line = WidgetCopy.warmLine(for: book, at: date) {
                    Text(line)
                        .font(WTheme.font(WTheme.semibold, 11))
                        .foregroundStyle(WTheme.primary)
                        .lineLimit(2)
                        .padding(.bottom, 8)
                }

                ProgressTrack(fraction: book.pageCount > 0 ? Double(book.currentPage) / Double(book.pageCount) : 0)
            }
            .padding(.vertical, 16)
            .padding(.horizontal, 18)
        }
    }
}

// MARK: - 5b · Room pulse (people-first)

struct RoomPulseFace: View {
    let room: WidgetRoom

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 12) {
                CoverArt(file: room.coverFile, duotone: room.duotone, title: room.bookTitle ?? room.name, titleSize: 7)
                    .frame(width: 40, height: 56)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

                VStack(alignment: .leading, spacing: 3) {
                    Eyebrow(text: room.name)
                    Text(room.bookTitle ?? "No book yet")
                        .font(WTheme.font(WTheme.extraBold, 15))
                        .foregroundStyle(WTheme.onSurface)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                MemberStack(initials: Array((room.memberInitials ?? []).prefix(3)))
            }

            Spacer(minLength: 6)

            Text(WidgetCopy.hook(for: room))
                .font(WTheme.font(WTheme.semibold, 12))
                .foregroundStyle(WTheme.primary)
                .lineSpacing(3)
                .lineLimit(2)

            Spacer(minLength: 6)

            HStack {
                if let myPage = room.myPage {
                    Text("You · p. \(Int(myPage))")
                }
                Spacer()
                if let median = room.medianPage {
                    Text("Room median · p. \(Int(median))")
                }
            }
            .font(WTheme.font(WTheme.semibold, 10))
            .foregroundStyle(WTheme.onSurfaceVariant)
            .padding(.bottom, 4)

            ProgressTrack(fraction: fraction(room.myPage), tick: room.medianPage.map { fraction($0) })
        }
        .padding(.vertical, 16)
        .padding(.horizontal, 18)
    }

    private func fraction(_ page: Double?) -> Double {
        guard let page, let total = room.totalPages, total > 0 else {
            return 0
        }
        return page / total
    }
}

/// Up to three members, 30pt, overlapping by 9 with a surface ring.
struct MemberStack: View {
    let initials: [String]

    var body: some View {
        HStack(spacing: -9) {
            ForEach(Array(initials.enumerated()), id: \.offset) { _, value in
                Text(value)
                    .font(WTheme.font(WTheme.bold, 10))
                    .foregroundStyle(WTheme.onSurface)
                    .frame(width: 30, height: 30)
                    .background(Circle().fill(WTheme.surfaceContainerHighest))
                    .overlay(Circle().stroke(WTheme.surface, lineWidth: 2))
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(initials.count) members")
    }
}

// MARK: - Empty · no current book (mirrors 3a)

struct StartReadingFace: View {
    var body: some View {
        HStack(spacing: 16) {
            Image("PandaMark")
                .resizable()
                .scaledToFit()
                .frame(width: 88, height: 88)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

            VStack(alignment: .leading, spacing: 6) {
                Eyebrow(text: "Your nightstand is empty")
                Text("Start your first book")
                    .font(WTheme.font(WTheme.extraBold, 16))
                    .foregroundStyle(WTheme.onSurface)
                Text("Pick one and this becomes your reading home.")
                    .font(WTheme.font(WTheme.semibold, 11))
                    .foregroundStyle(WTheme.primary)
                    .lineLimit(2)
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 16)
        .padding(.horizontal, 18)
    }
}
