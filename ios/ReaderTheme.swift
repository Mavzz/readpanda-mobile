//
//  ReaderTheme.swift
//  ReadPanda
//
//  The Nocturnal Sanctuary tokens, mirrored from src/styles/global.js.
//
//  The reader's chrome is drawn natively now, so it can no longer read the
//  JS token module. Changing a colour there means changing it here too —
//  the two lists are kept in the same order so they can be diffed by eye.
//

import UIKit

extension UIColor {
    /// 0xRRGGBB, matching how the tokens are written in JS.
    convenience init(rgb: UInt32, alpha: CGFloat = 1.0) {
        self.init(
            red: CGFloat((rgb >> 16) & 0xFF) / 255.0,
            green: CGFloat((rgb >> 8) & 0xFF) / 255.0,
            blue: CGFloat(rgb & 0xFF) / 255.0,
            alpha: alpha
        )
    }
}

enum DS {

    enum Colors {
        // Surface hierarchy (Level 0 → highest)
        static let background = UIColor(rgb: 0x0b1326)
        static let surface = UIColor(rgb: 0x0b1326)
        static let surfaceContainerLowest = UIColor(rgb: 0x060d20)
        static let surfaceContainerLow = UIColor(rgb: 0x131b2e)
        static let surfaceContainer = UIColor(rgb: 0x171f33)
        static let surfaceContainerHigh = UIColor(rgb: 0x222a3e)
        static let surfaceContainerHighest = UIColor(rgb: 0x2d3654)

        // Brand / accent
        static let primary = UIColor(rgb: 0xffddb8)
        static let primaryContainer = UIColor(rgb: 0xffb95f)
        static let onPrimary = UIColor(rgb: 0x472a00)

        // Text hierarchy
        static let onSurface = UIColor(rgb: 0xdae2fd)
        static let onSurfaceVariant = UIColor(rgb: 0xd6c3b2)

        // Error / notification
        static let error = UIColor(rgb: 0xffb4ab)

        /// The passage tint. Read threads sit back; unread ones lean forward.
        static let highlight = primary
    }

    enum Fonts {
        /// Manrope is registered through UIAppFonts, but a missing face should
        /// degrade to a system weight rather than crash the reader.
        private static func manrope(_ name: String, _ size: CGFloat, _ fallback: UIFont.Weight) -> UIFont {
            return UIFont(name: name, size: size) ?? .systemFont(ofSize: size, weight: fallback)
        }

        static func regular(_ size: CGFloat) -> UIFont { manrope("Manrope-Regular", size, .regular) }
        static func medium(_ size: CGFloat) -> UIFont { manrope("Manrope-Medium", size, .medium) }
        static func semibold(_ size: CGFloat) -> UIFont { manrope("Manrope-SemiBold", size, .semibold) }
        static func bold(_ size: CGFloat) -> UIFont { manrope("Manrope-Bold", size, .bold) }
        static func extraBold(_ size: CGFloat) -> UIFont { manrope("Manrope-ExtraBold", size, .heavy) }
    }

    enum Radius {
        static let sm: CGFloat = 12
        static let md: CGFloat = 24
        static let hero: CGFloat = 28
        static let comment: CGFloat = 20
        /// `9999` in JS means "a pill"; here it is applied as half the height.
        static let full: CGFloat = 9999
    }
}

/// A linear gradient baked into an image.
///
/// A `CAGradientLayer` inserted into a UIButton's own layer ends up *above* its
/// glyph: UIButton creates `imageView` lazily and inserts that view's layer at
/// index 0, under anything added earlier. A background image is drawn beneath
/// the content by definition, so the ordering can't come out wrong.
func readerGradientImage(size: CGSize, colors: [UIColor], start: CGPoint, end: CGPoint) -> UIImage {
    let gradient = CAGradientLayer()
    gradient.frame = CGRect(origin: .zero, size: size)
    gradient.colors = colors.map { $0.cgColor }
    gradient.startPoint = start
    gradient.endPoint = end

    return UIGraphicsImageRenderer(size: size).image { context in
        gradient.render(in: context.cgContext)
    }
}

/// An SF Symbol at a given point size, tinted. The chrome used Ionicons in JS;
/// these are the nearest system equivalents, so the glyphs come from the OS
/// rather than from a bundled icon font the native side can't lay out.
func readerIcon(_ name: String, size: CGFloat, weight: UIImage.SymbolWeight = .semibold) -> UIImage? {
    let config = UIImage.SymbolConfiguration(pointSize: size, weight: weight)
    return UIImage(systemName: name, withConfiguration: config)?
        .withRenderingMode(.alwaysTemplate)
}
