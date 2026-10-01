//
//  WidgetTheme.swift
//  ReadPandaWidget
//
//  The app's design tokens (src/styles/global.js, ios/ReaderTheme.swift) as
//  SwiftUI values, plus the pieces both faces share: the cover, the progress
//  track and the streak flame.
//

import SwiftUI

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: opacity
        )
    }

    /// "#2e3a54" → Color, for the duotones the app computes.
    init?(hexString: String) {
        let trimmed = hexString.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        guard trimmed.count == 6, let value = UInt32(trimmed, radix: 16) else {
            return nil
        }
        self.init(hex: value)
    }
}

enum WTheme {
    static let surface = Color(hex: 0x0b1326)
    static let surfaceContainer = Color(hex: 0x171f33)
    static let surfaceContainerHighest = Color(hex: 0x2d3654)
    static let primary = Color(hex: 0xffddb8)
    static let primaryContainer = Color(hex: 0xffb95f)
    static let onSurface = Color(hex: 0xdae2fd)
    static let onSurfaceVariant = Color(hex: 0xd6c3b2)

    static let background = LinearGradient(
        colors: [Color(hex: 0x171f33), Color(hex: 0x0b1326)],
        startPoint: .top,
        endPoint: .bottom
    )

    static func font(_ name: String, _ size: CGFloat) -> Font {
        .custom(name, size: size)
    }

    static let extraBold = "Manrope-ExtraBold"
    static let bold = "Manrope-Bold"
    static let semibold = "Manrope-SemiBold"
}

/// The real cover, or the book's duotone with its title — the same fallback
/// the app draws (FIRST_RUN_3a_3b.md "Tile imagery").
struct CoverArt: View {
    let file: String?
    let duotone: [String]?
    let title: String
    var titleSize: CGFloat = 12

    var body: some View {
        if let image = cachedCover(file) {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
        } else {
            ZStack(alignment: .bottomLeading) {
                LinearGradient(colors: duotoneColors, startPoint: .topLeading, endPoint: .bottomTrailing)
                // Too small to read on 5b's 40pt mini cover, where it also
                // broke titles mid-word — the duotone alone carries it there.
                if titleSize >= 9 {
                    Text(title)
                        .font(.system(size: titleSize, design: .serif))
                        .foregroundStyle(WTheme.onSurface.opacity(0.85))
                        .lineLimit(3)
                        .padding(10)
                }
            }
        }
    }

    private var duotoneColors: [Color] {
        let colors = (duotone ?? []).compactMap { Color(hexString: $0) }
        return colors.count >= 2 ? colors : [Color(hex: 0x2e3a54), Color(hex: 0x151d32)]
    }
}

/// Height 5, pill, surface track, primary gradient fill that never shrinks
/// below a visible nub — and an optional tick for the room median.
struct ProgressTrack: View {
    let fraction: Double
    var tick: Double?

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(WTheme.surfaceContainerHighest)
                Capsule()
                    .fill(LinearGradient(
                        colors: [WTheme.primary, WTheme.primaryContainer],
                        startPoint: .leading,
                        endPoint: .trailing
                    ))
                    .frame(width: max(10, geo.size.width * clamp(fraction)))
                if let tick {
                    Rectangle()
                        .fill(WTheme.onSurface.opacity(0.6))
                        .frame(width: 2, height: 9)
                        .offset(x: geo.size.width * clamp(tick) - 1)
                }
            }
            .frame(height: 5)
            .frame(maxHeight: .infinity, alignment: .center)
        }
        .frame(height: 9)
    }

    private func clamp(_ value: Double) -> Double {
        min(1, max(0, value))
    }
}

/// Shown only for a streak of three days or more — absence is never punished.
struct StreakFlame: View {
    let days: Int

    var body: some View {
        if days >= 3 {
            HStack(spacing: 3) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 11, weight: .bold))
                Text("\(days)")
                    .font(WTheme.font(WTheme.bold, 10))
            }
            .foregroundStyle(WTheme.primaryContainer)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(days)-day reading streak")
        }
    }
}

/// Eyebrow type: 10/700, uppercase, tracked.
struct Eyebrow: View {
    let text: String

    var body: some View {
        Text(text)
            .font(WTheme.font(WTheme.bold, 10))
            .textCase(.uppercase)
            .tracking(1)
            .foregroundStyle(WTheme.onSurfaceVariant)
            .lineLimit(1)
    }
}
