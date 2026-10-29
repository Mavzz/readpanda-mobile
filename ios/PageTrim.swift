//
//  PageTrim.swift
//  ReadPanda
//
//  The book's own white margins, trimmed so its text sits a fixed distance
//  from the page area's edge (specs/reader-fit). One box for the whole book:
//  PDFKit fits one zoom to the widest page shown, so a page trimmed on its
//  own would shrink every other one. Only PDFKit and CoreGraphics, so it can
//  be run against test PDFs off the device.
//

import PDFKit

enum PageTrim {
    /// A picture covering this much of a page makes it a cover or a scan,
    /// which is left out of the box (R1.1).
    private static let fullPageShare: CGFloat = 0.7
    /// A box this wide or wider isn't worth trimming to (R1.3).
    private static let widestWorthTrimming: CGFloat = 0.95

    /// The area holding every page's text and pictures, as fractions of a
    /// page's crop box (origin at its bottom left, like the page), or nil
    /// for "don't trim". Fractions, so pages of different sizes combine.
    /// Nil too if `isCancelled` turns true part way (R2.3).
    static func find(in document: PDFDocument, isCancelled: () -> Bool = { false }) -> CGRect? {
        var box: CGRect?
        for index in 0..<document.pageCount {
            if isCancelled() {
                return nil
            }
            guard let page = document.page(at: index), let content = contentArea(of: page) else {
                continue
            }
            box = box.map { $0.union(content) } ?? content
        }
        guard let found = box?.intersection(CGRect(x: 0, y: 0, width: 1, height: 1)),
            !found.isNull, found.width < widestWorthTrimming
        else {
            return nil
        }
        return found
    }

    /// Kept round the text when a page is trimmed, in page points, so the
    /// theme's edge cover (ThemedPdfPage) never reaches a glyph.
    static let padding: CGFloat = 4

    /// Shows `box` on every page as its art box, padded and kept inside the
    /// page, or the whole crop box for nil. Only the art box changes: saved
    /// comment and highlight positions are fractions of the crop box, shared
    /// with other readers, so it stays as the file has it (R1.2).
    static func apply(_ box: CGRect?, to document: PDFDocument) {
        for index in 0..<document.pageCount {
            guard let page = document.page(at: index) else {
                continue
            }
            let crop = page.bounds(for: .cropBox)
            guard let box = box else {
                page.setBounds(crop, for: .artBox)
                continue
            }
            let shown = CGRect(
                x: crop.minX + box.minX * crop.width,
                y: crop.minY + box.minY * crop.height,
                width: box.width * crop.width,
                height: box.height * crop.height
            ).insetBy(dx: -padding, dy: -padding).intersection(crop)
            page.setBounds(shown.isNull ? crop : shown, for: .artBox)
        }
    }

    /// What was found for a book file before: a box, or "don't trim".
    enum Remembered {
        case trim(CGRect)
        case untrimmed
    }

    /// Keyed by the file's SHA-256: the trim depends only on the file, so a
    /// re-exported book is measured again. "v1" so a change to `find` can
    /// leave old results behind.
    private static func key(_ hash: String) -> String {
        "reader_fit_v1_\(hash)"
    }

    static func remembered(for hash: String) -> Remembered? {
        guard !hash.isEmpty, let stored = UserDefaults.standard.array(forKey: key(hash)) as? [Double] else {
            return nil
        }
        guard stored.count == 4 else {
            return .untrimmed
        }
        return .trim(CGRect(x: stored[0], y: stored[1], width: stored[2], height: stored[3]))
    }

    static func remember(_ box: CGRect?, for hash: String) {
        guard !hash.isEmpty else {
            return
        }
        // An empty list is "don't trim", so that's remembered too.
        let stored = box.map { [Double($0.minX), Double($0.minY), Double($0.width), Double($0.height)] } ?? []
        UserDefaults.standard.set(stored, forKey: key(hash))
    }

    /// One page's text and pictures as fractions of its crop box, or nil for
    /// a page left out: blank, or one picture over most of it.
    static func contentArea(of page: PDFPage) -> CGRect? {
        let crop = page.bounds(for: .cropBox)
        guard crop.width > 0, crop.height > 0 else {
            return nil
        }
        let pictures = page.pageRef.map { PageImageScanner.imageAreas(of: $0) } ?? []
        let isFullPage = pictures.contains { area in
            let shown = area.intersection(crop)
            return !shown.isNull && shown.width * shown.height >= crop.width * crop.height * fullPageShare
        }
        if isFullPage {
            return nil
        }
        // Every glyph on the page, running heads and page numbers included.
        var areas = pictures.map { $0.intersection(crop) }.filter { !$0.isNull && !$0.isEmpty }
        if let text = page.selection(for: crop), !(text.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let bounds = text.bounds(for: page).intersection(crop)
            if !bounds.isNull, !bounds.isEmpty {
                areas.append(bounds)
            }
        }
        guard let first = areas.first else {
            return nil
        }
        let content = areas.dropFirst().reduce(first) { $0.union($1) }
        return CGRect(
            x: (content.minX - crop.minX) / crop.width,
            y: (content.minY - crop.minY) / crop.height,
            width: content.width / crop.width,
            height: content.height / crop.height
        )
    }
}
