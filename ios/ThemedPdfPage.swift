//
//  ThemedPdfPage.swift
//  ReadPanda
//
//  Settings → Page theme, drawn into the page (specs/page-theme). PDFKit can't
//  restyle a PDF's text, so the theme is laid over each page as it's drawn,
//  round its images. The comment and highlight marks stay PDFKit's: it draws
//  them on a layer above the page, so the theme never reaches them.
//

import PDFKit

/// A document whose pages draw in a page theme. Created in place of a plain
/// PDFDocument so every page it makes is a ThemedPdfPage.
class ThemedPdfDocument: PDFDocument {
    var theme = PageTheme.paper

    override var pageClass: AnyClass {
        ThemedPdfPage.self
    }
}

class ThemedPdfPage: PDFPage {
    /// An image this much of the page or more is a scanned page, and Night
    /// inverts it like text (R4.3).
    private static let scanShare: CGFloat = 0.7

    /// Tiles are drawn on several threads at once; the page is scanned once,
    /// by whichever gets there first (R7.2).
    private let lock = NSLock()
    private var scannedAreas: [CGRect]?

    private var imageAreas: [CGRect] {
        lock.lock()
        defer { lock.unlock() }
        if let areas = scannedAreas {
            return areas
        }
        let areas = pageRef.map { PageImageScanner.imageAreas(of: $0) } ?? []
        scannedAreas = areas
        return areas
    }

    override func draw(with box: PDFDisplayBox, to context: CGContext) {
        let theme = (document as? ThemedPdfDocument)?.theme ?? .paper
        super.draw(with: box, to: context)
        guard theme != .paper else {
            return
        }

        context.saveGState()
        transform(context, for: box)
        let page = bounds(for: box)
        let images = imageAreas.filter { $0.intersects(page) }
        let isScan = images.contains { area in
            let shown = area.intersection(page)
            return shown.width * shown.height >= page.width * page.height * Self.scanShare
        }

        // Everything but the images (R5.1). A scan in Night is the exception:
        // it's a picture of text, and is inverted like text. A scan in Sepia
        // is left alone, as it's already the colour of paper.
        context.saveGState()
        if !(theme == .night && isScan) {
            context.addRect(page)
            images.forEach { context.addRect($0) }
            context.clip(using: .evenOdd)
        }
        // PDFView paints the page white before this runs, so the fill covers
        // the paper as well as what's printed on it.
        switch theme {
        case .sepia:
            // Multiplying turns the white sepia and leaves black black.
            context.setBlendMode(.multiply)
            context.setFillColor(DS.Colors.readerSepia.cgColor)
        case .night:
            // The difference from pure white is the inverse: the paper goes
            // black and black text goes white. White here is arithmetic, not
            // a page colour.
            context.setBlendMode(.difference)
            context.setFillColor(UIColor.white.cgColor)
        case .paper:
            break
        }
        context.fill(page)
        context.restoreGState()

        // PDFView's white page reaches a pixel past the box this is clipped
        // to, which left a white hairline round every page in Night. Covered
        // in the paper colour, a few pixels across the edge.
        context.resetClip()
        let pixel = 1 / max(abs(context.ctm.a), abs(context.ctm.b), 0.0001)
        context.setStrokeColor(theme.paperColor.cgColor)
        context.setLineWidth(pixel * 4)
        context.stroke(page)
        context.restoreGState()
    }
}

extension PageTheme {
    /// A passage fill's colour (a comment's, or a personal highlight) on this
    /// theme's paper, from its colour on white.
    func fillColor(_ color: UIColor) -> UIColor {
        var alpha: CGFloat = 0
        color.getRed(nil, green: nil, blue: nil, alpha: &alpha)
        switch self {
        case .paper:
            return color
        case .sepia:
            // Stronger: at Paper's opacity yellow on cream barely shows. It
            // still multiplies, so black text stays black.
            return color.withAlphaComponent(min(1, alpha / 0.55))
        case .night:
            // Laid over white text rather than multiplied, so lighter: white
            // text on the most opaque fill is 5.7:1 (R6.2).
            return color.withAlphaComponent(alpha * 0.8)
        }
    }
}

/// A passage fill in Night. PDFKit's highlight multiplies, and multiplied onto
/// black it only tints the text. This lays the colour over it instead.
class ThemedMark: PDFAnnotation {
    convenience init(bounds: CGRect, color: UIColor) {
        // A square, not a highlight: PDFKit draws a highlight its own way
        // and never asks it to draw itself.
        self.init(bounds: bounds, forType: .square, withProperties: nil)
        self.color = color
    }

    override func draw(with box: PDFDisplayBox, in context: CGContext) {
        context.saveGState()
        // Into the shown box's space. The crop box starts at the page's
        // origin, so leaving this out only showed once a trimmed art box was
        // shown (specs/reader-fit): the fill landed off the words.
        page?.transform(context, for: box)
        context.setFillColor(color.cgColor)
        // Rounded like PDFKit's own highlight.
        let radius = bounds.height / 4
        context.addPath(CGPath(roundedRect: bounds, cornerWidth: radius, cornerHeight: radius, transform: nil))
        context.fillPath()
        context.restoreGState()
    }
}
