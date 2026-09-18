//
//  RNPdfViewer.swift
//  ReadPanda
//
//  Created by Venkataramaaditya Nimmagadda on 15/03/26.
//

import CryptoKit
import PDFKit
import React
import UIKit

@objc(RNPdfViewer)
class RNPdfViewerManager: RCTViewManager {

    override func view() -> UIView! {
        return RNPdfView()
    }

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
}

/// PDFView subclass that adds "Comment" to the selection menu.
///
/// The handoff asks for a `UIEditMenuInteraction` action alongside Copy.
/// `PDFView` owns its edit-menu interaction privately and exposes no delegate
/// seam to add to it, so the customization point that actually works on PDFView
/// is the responder-chain one underneath: a selector PDFView will offer because
/// `canPerformAction` says it can. `UIMenuController.menuItems` still feeds the
/// iOS 16+ edit menu for exactly this reason.
class CommentablePDFView: PDFView {

    var onCommentAction: (() -> Void)?

    override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
        if action == #selector(commentOnSelection(_:)) {
            // Only offer it when there is something to anchor a comment to.
            return currentSelection?.string?.isEmpty == false
        }
        return super.canPerformAction(action, withSender: sender)
    }

    @objc func commentOnSelection(_ sender: Any?) {
        onCommentAction?()
    }
}

/// Overlay that is invisible to touches except where one of its dots is.
/// A plain UIView here would swallow every scroll and every text selection,
/// because hit-testing doesn't care that a view is transparent.
class PassthroughView: UIView {
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        for subview in subviews where !subview.isHidden && subview.alpha > 0.01 {
            let converted = subview.convert(point, from: self)
            if subview.bounds.contains(converted) {
                return subview
            }
        }
        return nil
    }
}

class RNPdfView: UIView {

    private let pdfView = CommentablePDFView()

    /// Gutter dots live in their own layer above the page. An overlay rather
    /// than PDFAnnotation subclasses: dots have to be tappable and carry an
    /// unread badge, and annotations give neither for free.
    private let gutterLayer = PassthroughView()

    @objc var onPageChanged: RCTDirectEventBlock?
    @objc var onLoadComplete: RCTDirectEventBlock?
    @objc var onError: RCTDirectEventBlock?
    @objc var onCommentRequested: RCTDirectEventBlock?
    @objc var onThreadOpen: RCTDirectEventBlock?
    @objc var onSelectionChanged: RCTDirectEventBlock?

    /// Threads to draw on the page, pushed from JS. Each entry carries
    /// anchorKey, page, text, bounds, unreadCount and fileHash.
    private var threads: [NSDictionary] = []
    private var documentHash: String = ""
    private var addedHighlights: [(PDFPage, PDFAnnotation)] = []
    /// Each dot with the page and page-space rect it is pinned to, so scrolling
    /// only has to move frames rather than rebuild the overlay.
    private var gutterDots: [(button: UIButton, page: PDFPage, rect: CGRect)] = []
    private var scrollObserver: NSKeyValueObservation?
    private var overlayWork: DispatchWorkItem?
    private var selectionWork: DispatchWorkItem?

    private let unreadTint = UIColor(red: 1.0, green: 0.867, blue: 0.722, alpha: 1.0)   // #ffddb8
    private let onPrimary = UIColor(red: 0.278, green: 0.165, blue: 0.0, alpha: 1.0)    // #472a00
    private let readDot = UIColor(red: 0.725, green: 0.702, blue: 0.659, alpha: 1.0)    // #b9b3a8

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupPdfView()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupPdfView()
    }

    private func setupPdfView() {
        pdfView.autoScales = true
        // PDFKit's default is a mid gray that reads as a bug against the app's
        // dark chrome; the paper should meet the card edge cleanly.
        pdfView.backgroundColor = .white
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical
        pdfView.onCommentAction = { [weak self] in self?.emitCommentRequest() }
        addSubview(pdfView)

        gutterLayer.backgroundColor = .clear
        addSubview(gutterLayer)

        registerCommentMenuItem()

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handlePageChanged),
            name: .PDFViewPageChanged,
            object: pdfView
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleSelectionChanged),
            name: .PDFViewSelectionChanged,
            object: pdfView
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(scheduleOverlayRefresh),
            name: .PDFViewScaleChanged,
            object: pdfView
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(scheduleOverlayRefresh),
            name: .PDFViewVisiblePagesChanged,
            object: pdfView
        )
    }

    private func registerCommentMenuItem() {
        let item = UIMenuItem(title: "Comment", action: #selector(CommentablePDFView.commentOnSelection(_:)))
        let existing = UIMenuController.shared.menuItems ?? []
        if !existing.contains(where: { $0.action == item.action }) {
            UIMenuController.shared.menuItems = existing + [item]
        }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
        scrollObserver?.invalidate()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        pdfView.frame = bounds
        gutterLayer.frame = bounds
        scheduleOverlayRefresh()
    }

    // MARK: - Props

    @objc var pdfDetails: NSDictionary? {
        didSet {
            guard let details = pdfDetails,
                let urlString = details["url"] as? String,
                let url = URL(string: urlString)
            else {
                return
            }
            loadPdf(from: url)
        }
    }

    @objc var initialPage: NSNumber? {
        didSet {
            goToPage(initialPage?.intValue ?? 0)
        }
    }

    /// The threads JS wants drawn. Replacing the array redraws both the
    /// highlights and the gutter.
    @objc var comments: NSArray? {
        didSet {
            threads = (comments as? [NSDictionary]) ?? []
            scheduleOverlayRefresh()
        }
    }

    /// JS bumps this after the composer closes. Leaving the passage selected
    /// under a dismissed sheet reads as a bug.
    @objc var clearSelectionToken: NSNumber? {
        didSet {
            guard oldValue != nil else {
                return
            }
            pdfView.clearSelection()
            onSelectionChanged?(["hasSelection": false, "text": "", "page": -1])
        }
    }

    /// Opening a thread scrolls its passage into view, so the sheet and the
    /// page agree on what is being discussed.
    @objc var scrollToAnchorKey: NSString? {
        didSet {
            guard let key = scrollToAnchorKey as String?, !key.isEmpty else {
                return
            }
            scrollTo(anchorKey: key)
        }
    }

    // MARK: - Page + selection events

    @objc private func handlePageChanged() {
        guard let currentPage = pdfView.currentPage,
            let document = pdfView.document,
            let pageIndex = document.index(for: currentPage) as Int?
        else {
            return
        }
        onPageChanged?([
            "currentPage": pageIndex,
            "totalPages": document.pageCount,
        ])
        scheduleOverlayRefresh()
    }

    /// PDFKit posts this continuously while the grab handles are dragged, so
    /// the bridge crossing is coalesced — JS only needs the selection the
    /// reader settled on, not every intermediate word.
    @objc private func handleSelectionChanged() {
        selectionWork?.cancel()
        let work = DispatchWorkItem { [weak self] in self?.emitSelection() }
        selectionWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15, execute: work)
    }

    private func emitSelection() {
        guard let selection = pdfView.currentSelection,
            let text = selection.string?.trimmingCharacters(in: .whitespacesAndNewlines),
            !text.isEmpty
        else {
            onSelectionChanged?(["hasSelection": false, "text": "", "page": -1])
            return
        }
        onSelectionChanged?([
            "hasSelection": true,
            "text": text,
            "page": pageIndex(of: selection),
        ])
    }

    /// The reader chose "Comment" from the selection menu.
    private func emitCommentRequest() {
        guard let selection = pdfView.currentSelection,
            let text = selection.string?.trimmingCharacters(in: .whitespacesAndNewlines),
            !text.isEmpty
        else {
            return
        }
        onCommentRequested?([
            "page": pageIndex(of: selection),
            "text": text,
            "bounds": normalizedBounds(for: selection),
            "fileHash": documentHash,
        ])
    }

    /// A selection can run across a page break. It is filed under the page it
    /// starts on — the page the reader was looking at when they chose it.
    private func pageIndex(of selection: PDFSelection) -> Int {
        guard let document = pdfView.document else {
            return -1
        }
        let page = selection.pages.first ?? pdfView.currentPage
        guard let target = page else {
            return -1
        }
        return document.index(for: target)
    }

    /// Per-line rects expressed as fractions of the page box, so they survive
    /// zoom, rotation and a different device.
    private func normalizedBounds(for selection: PDFSelection) -> [[String: CGFloat]] {
        var rects: [[String: CGFloat]] = []
        for line in selection.selectionsByLine() {
            guard let page = line.pages.first else {
                continue
            }
            let box = page.bounds(for: .cropBox)
            guard box.width > 0, box.height > 0 else {
                continue
            }
            let r = line.bounds(for: page)
            rects.append([
                "x": (r.origin.x - box.origin.x) / box.width,
                "y": (r.origin.y - box.origin.y) / box.height,
                "w": r.width / box.width,
                "h": r.height / box.height,
            ])
        }
        return rects
    }

    // MARK: - Highlights and gutter

    @objc private func scheduleOverlayRefresh() {
        overlayWork?.cancel()
        let work = DispatchWorkItem { [weak self] in self?.refreshOverlays() }
        overlayWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05, execute: work)
    }

    /// The page scrolls continuously, so the dots have to follow it. PDFKit
    /// posts no notification for that, and rebuilding the overlay on every
    /// frame would be wasteful — so scrolling only moves the frames that are
    /// already there, and a rebuild happens when the threads themselves change.
    private func observeScrolling() {
        guard scrollObserver == nil, let scrollView = findScrollView(in: pdfView) else {
            return
        }
        scrollObserver = scrollView.observe(\.contentOffset, options: [.new]) { [weak self] _, _ in
            self?.repositionGutter()
        }
    }

    private func findScrollView(in view: UIView) -> UIScrollView? {
        for subview in view.subviews {
            if let scrollView = subview as? UIScrollView {
                return scrollView
            }
            if let nested = findScrollView(in: subview) {
                return nested
            }
        }
        return nil
    }

    /// Cheap enough to run on every scroll tick: no lookups, no allocation,
    /// just the frame each dot already knows it belongs at.
    private func repositionGutter() {
        for dot in gutterDots {
            let lineInView = pdfView.convert(dot.rect, from: dot.page)
            let pageInView = pdfView.convert(dot.page.bounds(for: .cropBox), from: dot.page)
            let size = dot.button.frame.width
            dot.button.frame = CGRect(
                x: min(bounds.width - size - 6, pageInView.maxX + 6),
                y: lineInView.midY - size / 2,
                width: size,
                height: size
            )
            // A dot for a passage that has scrolled away is hidden rather than
            // removed, so it comes back without a rebuild.
            dot.button.isHidden = lineInView.maxY < 0 || lineInView.minY > bounds.height
        }
    }

    private func refreshOverlays() {
        clearHighlights()
        gutterLayer.subviews.forEach { $0.removeFromSuperview() }
        gutterDots.removeAll()
        observeScrolling()

        guard let document = pdfView.document else {
            return
        }

        for thread in threads {
            guard let pageIndex = thread["page"] as? Int,
                pageIndex >= 0, pageIndex < document.pageCount,
                let page = document.page(at: pageIndex)
            else {
                continue
            }
            // Two PDFs can share a book id. An anchor taken from another
            // edition would land on the wrong words, so it is listed in the
            // sheet but never drawn on the page.
            let threadHash = (thread["fileHash"] as? String) ?? ""
            if !threadHash.isEmpty && !documentHash.isEmpty && threadHash != documentHash {
                continue
            }
            guard let rects = anchorRects(for: thread, on: page), !rects.isEmpty else {
                continue
            }

            let unread = (thread["unreadCount"] as? Int) ?? 0
            drawHighlights(rects, on: page, unread: unread > 0)
            drawGutterDot(for: thread, firstLine: rects[0], on: page, unread: unread)
        }
    }

    /// The passage as it sits on the page today. The stored text is looked up
    /// first so a re-flowed or re-exported edition still anchors correctly;
    /// the saved rects are the fallback for when the words have really gone.
    private func anchorRects(for thread: NSDictionary, on page: PDFPage) -> [CGRect]? {
        let text = (thread["text"] as? String) ?? ""
        if !text.isEmpty, let selection = findSelection(of: text, on: page) {
            return selection.selectionsByLine().map { $0.bounds(for: page) }
        }

        guard let stored = thread["bounds"] as? [[String: NSNumber]], !stored.isEmpty else {
            return nil
        }
        let box = page.bounds(for: .cropBox)
        return stored.compactMap { rect in
            guard let x = rect["x"]?.doubleValue, let y = rect["y"]?.doubleValue,
                let w = rect["w"]?.doubleValue, let h = rect["h"]?.doubleValue
            else {
                return nil
            }
            return CGRect(
                x: box.origin.x + CGFloat(x) * box.width,
                y: box.origin.y + CGFloat(y) * box.height,
                width: CGFloat(w) * box.width,
                height: CGFloat(h) * box.height
            )
        }
    }

    private func findSelection(of text: String, on page: PDFPage) -> PDFSelection? {
        guard let document = pdfView.document else {
            return nil
        }
        let matches = document.findString(text, withOptions: [.caseInsensitive])
        return matches.first { $0.pages.contains(page) }
    }

    /// Runtime only. These annotations are never written back — the manuscript
    /// on disk is the author's file, not a scratch pad.
    private func drawHighlights(_ rects: [CGRect], on page: PDFPage, unread: Bool) {
        let color = unreadTint.withAlphaComponent(unread ? 0.28 : 0.14)
        for rect in rects {
            let annotation = PDFAnnotation(bounds: rect, forType: .highlight, withProperties: nil)
            annotation.color = color
            annotation.shouldDisplay = true
            annotation.shouldPrint = false
            page.addAnnotation(annotation)
            addedHighlights.append((page, annotation))
        }
    }

    private func clearHighlights() {
        for (page, annotation) in addedHighlights {
            page.removeAnnotation(annotation)
        }
        addedHighlights.removeAll()
    }

    private func drawGutterDot(for thread: NSDictionary, firstLine: CGRect, on page: PDFPage, unread: Int) {
        let anchorKey = (thread["anchorKey"] as? String) ?? ""
        let lineInView = pdfView.convert(firstLine, from: page)
        let pageInView = pdfView.convert(page.bounds(for: .cropBox), from: page)

        let size: CGFloat = unread > 0 ? 22 : 12
        let dot = UIButton(type: .custom)
        dot.frame = CGRect(
            x: min(bounds.width - size - 6, pageInView.maxX + 6),
            y: lineInView.midY - size / 2,
            width: size,
            height: size
        )
        dot.layer.cornerRadius = size / 2
        dot.accessibilityIdentifier = anchorKey

        if unread > 0 {
            dot.backgroundColor = unreadTint
            dot.setTitle(unread > 9 ? "9+" : "\(unread)", for: .normal)
            dot.setTitleColor(onPrimary, for: .normal)
            dot.titleLabel?.font = .systemFont(ofSize: 10, weight: .heavy)
            dot.accessibilityLabel = "\(unread) unread comments"
        } else {
            dot.backgroundColor = readDot
            dot.accessibilityLabel = "Comments on this passage"
        }

        dot.addTarget(self, action: #selector(handleGutterTap(_:)), for: .touchUpInside)
        dot.isHidden = lineInView.maxY < 0 || lineInView.minY > bounds.height
        gutterLayer.addSubview(dot)
        gutterDots.append((button: dot, page: page, rect: firstLine))
    }

    @objc private func handleGutterTap(_ sender: UIButton) {
        guard let key = sender.accessibilityIdentifier, !key.isEmpty else {
            return
        }
        onThreadOpen?(["anchorKey": key])
    }

    private func scrollTo(anchorKey: String) {
        guard let document = pdfView.document else {
            return
        }
        guard let thread = threads.first(where: { ($0["anchorKey"] as? String) == anchorKey }),
            let pageIndex = thread["page"] as? Int,
            pageIndex >= 0, pageIndex < document.pageCount,
            let page = document.page(at: pageIndex)
        else {
            return
        }
        let text = (thread["text"] as? String) ?? ""
        if !text.isEmpty, let selection = findSelection(of: text, on: page) {
            pdfView.go(to: selection)
        } else {
            pdfView.go(to: page)
        }
    }

    // MARK: - Loading

    private func goToPage(_ pageIndex: Int) {
        guard let document = pdfView.document,
            pageIndex >= 0,
            pageIndex < document.pageCount,
            let page = document.page(at: pageIndex)
        else {
            return
        }
        pdfView.go(to: page)
    }

    private func loadPdf(from url: URL) {
        if url.isFileURL {
            if let data = try? Data(contentsOf: url), let document = PDFDocument(data: data) {
                pdfView.document = document
                notifyLoadComplete(document: document, data: data)
                if let page = initialPage?.intValue {
                    goToPage(page)
                }
            } else {
                onError?(["message": "Failed to load local PDF file."])
            }
        } else {
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                do {
                    let data = try Data(contentsOf: url)
                    guard let document = PDFDocument(data: data) else {
                        DispatchQueue.main.async {
                            self?.onError?(["message": "Failed to parse PDF data."])
                        }
                        return
                    }
                    DispatchQueue.main.async {
                        self?.pdfView.document = document
                        self?.notifyLoadComplete(document: document, data: data)
                        if let page = self?.initialPage?.intValue {
                            self?.goToPage(page)
                        }
                    }
                } catch {
                    DispatchQueue.main.async {
                        self?.onError?([
                            "message": "Failed to download PDF: \(error.localizedDescription)"
                        ])
                    }
                }
            }
        }
    }

    /// The fingerprint of the file actually opened. Comment anchors are stored
    /// against it, so a different edition under the same book id can be told
    /// apart and left undrawn.
    private func notifyLoadComplete(document: PDFDocument, data: Data) {
        documentHash = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        onLoadComplete?([
            "totalPages": document.pageCount,
            "fileHash": documentHash,
        ])
        scheduleOverlayRefresh()
    }
}
