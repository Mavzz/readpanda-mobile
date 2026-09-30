//
//  RNPdfViewer.swift
//  ReadPanda
//
//  Created by Venkataramaaditya Nimmagadda on 15/03/26.
//
//  The whole reading surface: the page, the chrome around it, the passage
//  highlights, the gutter, the scrubber and the thread sheet.
//
//  JS keeps what it is good at — the comments store, the API, auth, the
//  optimistic retry queue — and pushes threads down as data. Everything the
//  reader sees or touches while reading is drawn here, so page position and
//  selection never have to cross the bridge to be rendered.
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
    /// Solo reading has no audience, so the passage menu offers nothing extra.
    var commentingEnabled = false

    override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
        if action == #selector(commentOnSelection(_:)) {
            // Only offer it when there is something to anchor a comment to.
            return commentingEnabled && currentSelection?.string?.isEmpty == false
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

class RNPdfView: UIView, ReaderHeaderDelegate, CommentSheetDelegate {

    /// The passage a comment can be anchored to is capped to the same length
    /// the API accepts, so a runaway drag can't produce a write the server
    /// truncates.
    private static let maxAnchorLength = 1000

    private let header = ReaderHeaderView()
    private let scrubber = ReaderScrubberView()
    /// The page is a card on the chrome, not full-bleed — it's what separates
    /// the manuscript from the app's own furniture above and below it.
    private let pageContainer = UIView()
    private let pdfView = CommentablePDFView()
    private let status = ReaderStatusView()
    private let sheet = CommentSheetView()

    /// Gutter dots live in their own layer above the page. An overlay rather
    /// than PDFAnnotation subclasses: dots have to be tappable and carry an
    /// unread badge, and annotations give neither for free.
    private let gutterLayer = PassthroughView()

    @objc var onPageChanged: RCTDirectEventBlock?
    @objc var onLoadComplete: RCTDirectEventBlock?
    @objc var onError: RCTDirectEventBlock?
    @objc var onBack: RCTDirectEventBlock?
    @objc var onSearch: RCTDirectEventBlock?
    @objc var onThreadOpened: RCTDirectEventBlock?
    @objc var onSubmitComment: RCTDirectEventBlock?
    @objc var onLikeComment: RCTDirectEventBlock?
    @objc var onRetryComment: RCTDirectEventBlock?
    @objc var onRoomPickerRequested: RCTDirectEventBlock?

    private var parsedThreads: [ReaderThread] = []
    private var documentHash: String = ""
    private var currentPageIndex: Int = 0
    private var addedHighlights: [(PDFPage, PDFAnnotation)] = []
    /// Each dot with the page and page-space rect it is pinned to, so scrolling
    /// only has to move frames rather than rebuild the overlay.
    private var gutterDots: [(button: UIButton, page: PDFPage, rect: CGRect)] = []
    private var scrollObserver: NSKeyValueObservation?
    private var overlayWork: DispatchWorkItem?
    private var lastLoadedURL: URL?

    private let unreadTint = UIColor(rgb: 0xffddb8)
    private let readDot = UIColor(rgb: 0xb9b3a8)

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupPdfView()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupPdfView()
    }

    private func setupPdfView() {
        backgroundColor = DS.Colors.background

        header.delegate = self
        addSubview(header)

        pageContainer.backgroundColor = .clear
        pageContainer.layer.cornerRadius = DS.Radius.sm
        pageContainer.clipsToBounds = true
        addSubview(pageContainer)

        pdfView.autoScales = true
        // PDFKit's default is a mid gray that reads as a bug against the app's
        // dark chrome; the paper should meet the card edge cleanly.
        pdfView.backgroundColor = .white
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical
        pdfView.onCommentAction = { [weak self] in self?.commentOnSelection() }
        pageContainer.addSubview(pdfView)

        gutterLayer.backgroundColor = .clear
        pageContainer.addSubview(gutterLayer)

        status.onRetry = { [weak self] in self?.reload() }
        pageContainer.addSubview(status)

        scrubber.isHidden = true
        addSubview(scrubber)

        sheet.delegate = self
        addSubview(sheet)

        registerCommentMenuItem()

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handlePageChanged),
            name: .PDFViewPageChanged,
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

    override func safeAreaInsetsDidChange() {
        super.safeAreaInsetsDidChange()
        setNeedsLayout()
    }

    override func layoutSubviews() {
        super.layoutSubviews()

        header.frame = CGRect(
            x: 0,
            y: safeAreaInsets.top,
            width: bounds.width,
            height: ReaderHeaderView.height
        )

        // Below the page, not over it — the design puts the scrubber on the
        // chrome so nothing covers the words.
        let scrubberHeight = ReaderScrubberView.contentHeight + max(safeAreaInsets.bottom, 12)
        scrubber.frame = CGRect(
            x: 0,
            y: bounds.height - scrubberHeight,
            width: bounds.width,
            height: scrubberHeight
        )

        let top = header.frame.maxY
        let bottom = scrubber.isHidden ? bounds.height : scrubber.frame.minY
        pageContainer.frame = CGRect(
            x: 12,
            y: top,
            width: max(0, bounds.width - 24),
            height: max(0, bottom - top)
        )
        pdfView.frame = pageContainer.bounds
        gutterLayer.frame = pageContainer.bounds
        status.frame = pageContainer.bounds
        sheet.frame = bounds

        scheduleOverlayRefresh()
    }

    // MARK: - Props

    @objc var pdfDetails: NSDictionary? {
        didSet {
            let urlString = (pdfDetails?["url"] as? String) ?? ""
            guard !urlString.isEmpty, let url = URL(string: urlString) else {
                status.show(.empty)
                return
            }
            guard url != lastLoadedURL else {
                return
            }
            loadPdf(from: url)
        }
    }

    @objc var bookTitle: NSString? {
        didSet {
            header.title = (bookTitle as String?) ?? ""
        }
    }

    @objc var initialPage: NSNumber? {
        didSet {
            goToPage(initialPage?.intValue ?? 0)
        }
    }

    /// The threads JS wants drawn and discussed. Replacing the array redraws
    /// the highlights, the gutter and the scrubber's ticks, and refreshes an
    /// open sheet in place.
    @objc var threads: NSArray? {
        didSet {
            parsedThreads = ((threads as? [NSDictionary]) ?? []).map { ReaderThread($0) }
            scrubber.commentPages = Array(Set(parsedThreads.map { $0.page }))
            scheduleOverlayRefresh()
            refreshSheet()
        }
    }

    /// Solo books have no room and therefore no conversation — none of the
    /// commenting chrome appears for them.
    @objc var hasRoom: NSNumber? {
        didSet {
            let enabled = hasRoom?.boolValue ?? false
            header.showsComment = enabled
            pdfView.commentingEnabled = enabled
            setNeedsLayout()
        }
    }

    @objc var canPickRoom: NSNumber?

    @objc var roomName: NSString? {
        didSet {
            refreshSheet()
        }
    }

    /// Unlocked comments the reader hasn't seen: the chrome dot, and the
    /// scrubber's "waiting behind you".
    @objc var unreadTotal: NSNumber? {
        didSet {
            let count = unreadTotal?.intValue ?? 0
            header.unreadCount = count
            scrubber.waitingCount = count
        }
    }

    @objc var lockedCount: NSNumber? {
        didSet {
            scrubber.lockedCount = lockedCount?.intValue ?? 0
        }
    }

    /// True while JS has a write in flight, so the composer can show it.
    @objc var submitting: NSNumber? {
        didSet {
            refreshSheet()
        }
    }

    /// Lets JS drive the reader to a thread — a notification tapped elsewhere
    /// in the app lands on the passage, with its conversation open.
    @objc var openThreadKey: NSString? {
        didSet {
            guard let key = openThreadKey as String?, !key.isEmpty else {
                return
            }
            openThread(anchorKey: key)
        }
    }

    // MARK: - Page events

    @objc private func handlePageChanged() {
        guard let currentPage = pdfView.currentPage,
            let document = pdfView.document
        else {
            return
        }
        let pageIndex = document.index(for: currentPage)
        currentPageIndex = pageIndex
        scrubber.currentPage = pageIndex
        onPageChanged?([
            "currentPage": pageIndex,
            "totalPages": document.pageCount,
        ])
        scheduleOverlayRefresh()
    }

    // MARK: - Header

    func readerHeaderDidTapBack(_ header: ReaderHeaderView) {
        onBack?([:])
    }

    /// The chrome icon — a page-level thread, no quote block.
    func readerHeaderDidTapComment(_ header: ReaderHeaderView) {
        if let existing = parsedThreads.first(where: { $0.page == currentPageIndex && $0.anchorText.isEmpty }) {
            openThread(anchorKey: existing.anchorKey)
            return
        }
        sheet.open(target: .draft(
            page: currentPageIndex,
            anchorText: "",
            bounds: [],
            fileHash: documentHash
        ))
        refreshSheet()
    }

    /// Only asked when the book really is in more than one room.
    func readerHeaderDidLongPressComment(_ header: ReaderHeaderView) {
        guard canPickRoom?.boolValue == true else {
            return
        }
        onRoomPickerRequested?([:])
    }

    func readerHeaderDidTapSearch(_ header: ReaderHeaderView) {
        onSearch?([:])
    }

    // MARK: - Selection

    /// The reader chose "Comment" from the selection menu — a new thread on
    /// that passage.
    private func commentOnSelection() {
        guard let selection = pdfView.currentSelection,
            let raw = selection.string?.trimmingCharacters(in: .whitespacesAndNewlines),
            !raw.isEmpty
        else {
            return
        }
        let text = String(raw.prefix(RNPdfView.maxAnchorLength))
        sheet.open(target: .draft(
            page: pageIndex(of: selection),
            anchorText: text,
            bounds: normalizedBounds(for: selection),
            fileHash: documentHash
        ))
        refreshSheet()
    }

    /// A selection can run across a page break. It is filed under the page it
    /// starts on — the page the reader was looking at when they chose it.
    private func pageIndex(of selection: PDFSelection) -> Int {
        guard let document = pdfView.document else {
            return -1
        }
        guard let target = selection.pages.first ?? pdfView.currentPage else {
            return -1
        }
        return document.index(for: target)
    }

    /// Per-line rects expressed as fractions of the page box, so they survive
    /// zoom, rotation and a different device.
    private func normalizedBounds(for selection: PDFSelection) -> [NormalizedRect] {
        var rects: [NormalizedRect] = []
        for line in selection.selectionsByLine() {
            guard let page = line.pages.first else {
                continue
            }
            let box = page.bounds(for: .cropBox)
            guard box.width > 0, box.height > 0 else {
                continue
            }
            let r = line.bounds(for: page)
            rects.append(NormalizedRect(
                x: (r.origin.x - box.origin.x) / box.width,
                y: (r.origin.y - box.origin.y) / box.height,
                w: r.width / box.width,
                h: r.height / box.height
            ))
        }
        return rects
    }

    // MARK: - The sheet

    /// A gutter dot, or a thread JS asked for — scroll its passage into view so
    /// the sheet and the page agree on what is being discussed, and mark it read.
    private func openThread(anchorKey: String) {
        guard parsedThreads.contains(where: { $0.anchorKey == anchorKey }) else {
            return
        }
        scrollTo(anchorKey: anchorKey)
        sheet.open(target: .thread(anchorKey: anchorKey))
        refreshSheet()
        onThreadOpened?(["anchorKey": anchorKey])
    }

    private func refreshSheet() {
        sheet.update(
            threads: parsedThreads,
            roomName: (roomName as String?) ?? "",
            submitting: submitting?.boolValue ?? false
        )
    }

    func commentSheetDidClose(_ sheet: CommentSheetView) {
        sheet.close()
        clearSelection()
    }

    func commentSheet(_ sheet: CommentSheetView, didSubmit body: String, parentId: String?) {
        guard let target = sheet.target else {
            return
        }

        let page: Int
        let anchorText: String
        let bounds: [NormalizedRect]
        let fileHash: String

        switch target {
        case .thread(let anchorKey):
            guard let thread = parsedThreads.first(where: { $0.anchorKey == anchorKey }) else {
                return
            }
            page = thread.page
            anchorText = thread.anchorText
            bounds = thread.bounds
            fileHash = thread.fileHash.isEmpty ? documentHash : thread.fileHash
        case .draft(let draftPage, let draftText, let draftBounds, let draftHash):
            page = draftPage
            anchorText = draftText
            bounds = draftBounds
            fileHash = draftHash
        }

        onSubmitComment?([
            "page": page,
            "anchorText": anchorText,
            "bounds": bounds.map { $0.payload },
            "fileHash": fileHash,
            "parentId": parentId ?? NSNull(),
            "body": body,
        ])
        clearSelection()
    }

    func commentSheet(_ sheet: CommentSheetView, didLike comment: ReaderComment) {
        onLikeComment?(["commentId": comment.id])
    }

    func commentSheet(_ sheet: CommentSheetView, didRetry comment: ReaderComment) {
        onRetryComment?(["clientId": comment.clientId])
    }

    /// Drops the passage highlight the reader made. Leaving it selected under a
    /// dismissed sheet reads as a bug.
    private func clearSelection() {
        pdfView.clearSelection()
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
        let field = pageContainer.bounds
        for dot in gutterDots {
            let lineInView = pdfView.convert(dot.rect, from: dot.page)
            let pageInView = pdfView.convert(dot.page.bounds(for: .cropBox), from: dot.page)
            let size = dot.button.frame.width
            dot.button.frame = CGRect(
                x: min(field.width - size - 6, pageInView.maxX + 6),
                y: lineInView.midY - size / 2,
                width: size,
                height: size
            )
            // A dot for a passage that has scrolled away is hidden rather than
            // removed, so it comes back without a rebuild.
            dot.button.isHidden = lineInView.maxY < 0 || lineInView.minY > field.height
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

        for thread in parsedThreads {
            guard thread.page >= 0, thread.page < document.pageCount,
                let page = document.page(at: thread.page)
            else {
                continue
            }
            // Two PDFs can share a book id. An anchor taken from another
            // edition would land on the wrong words, so it is listed in the
            // sheet but never drawn on the page.
            if !thread.fileHash.isEmpty && !documentHash.isEmpty && thread.fileHash != documentHash {
                continue
            }
            guard let rects = anchorRects(for: thread, on: page), !rects.isEmpty else {
                continue
            }

            drawHighlights(rects, on: page, unread: thread.unreadCount > 0)
            drawGutterDot(for: thread, firstLine: rects[0], on: page)
        }
    }

    /// The passage as it sits on the page today. The stored text is looked up
    /// first so a re-flowed or re-exported edition still anchors correctly;
    /// the saved rects are the fallback for when the words have really gone.
    private func anchorRects(for thread: ReaderThread, on page: PDFPage) -> [CGRect]? {
        if !thread.anchorText.isEmpty, let selection = findSelection(of: thread.anchorText, on: page) {
            return selection.selectionsByLine().map { $0.bounds(for: page) }
        }

        guard !thread.bounds.isEmpty else {
            return nil
        }
        let box = page.bounds(for: .cropBox)
        return thread.bounds.map { $0.denormalized(in: box) }
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

    private func drawGutterDot(for thread: ReaderThread, firstLine: CGRect, on page: PDFPage) {
        let unread = thread.unreadCount
        let field = pageContainer.bounds
        let lineInView = pdfView.convert(firstLine, from: page)
        let pageInView = pdfView.convert(page.bounds(for: .cropBox), from: page)

        let size: CGFloat = unread > 0 ? 22 : 12
        let dot = UIButton(type: .custom)
        dot.frame = CGRect(
            x: min(field.width - size - 6, pageInView.maxX + 6),
            y: lineInView.midY - size / 2,
            width: size,
            height: size
        )
        dot.layer.cornerRadius = size / 2
        dot.accessibilityIdentifier = thread.anchorKey

        if unread > 0 {
            dot.backgroundColor = unreadTint
            dot.setTitle(unread > 9 ? "9+" : "\(unread)", for: .normal)
            dot.setTitleColor(DS.Colors.onPrimary, for: .normal)
            dot.titleLabel?.font = .systemFont(ofSize: 10, weight: .heavy)
            dot.accessibilityLabel = "\(unread) unread comments"
        } else {
            dot.backgroundColor = readDot
            dot.accessibilityLabel = "Comments on this passage"
        }

        dot.addTarget(self, action: #selector(handleGutterTap(_:)), for: .touchUpInside)
        dot.isHidden = lineInView.maxY < 0 || lineInView.minY > field.height
        gutterLayer.addSubview(dot)
        gutterDots.append((button: dot, page: page, rect: firstLine))
    }

    @objc private func handleGutterTap(_ sender: UIButton) {
        guard let key = sender.accessibilityIdentifier, !key.isEmpty else {
            return
        }
        openThread(anchorKey: key)
    }

    private func scrollTo(anchorKey: String) {
        guard let document = pdfView.document,
            let thread = parsedThreads.first(where: { $0.anchorKey == anchorKey }),
            thread.page >= 0, thread.page < document.pageCount,
            let page = document.page(at: thread.page)
        else {
            return
        }
        if !thread.anchorText.isEmpty, let selection = findSelection(of: thread.anchorText, on: page) {
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

    private func reload() {
        guard let url = lastLoadedURL else {
            return
        }
        loadPdf(from: url)
    }

    private func loadPdf(from url: URL) {
        lastLoadedURL = url
        status.show(.loading)

        if url.isFileURL {
            if let data = try? Data(contentsOf: url), let document = PDFDocument(data: data) {
                pdfView.document = document
                notifyLoadComplete(document: document, data: data)
                goToPage(initialPage?.intValue ?? 0)
            } else {
                fail("Failed to load local PDF file.")
            }
            return
        }

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            do {
                let data = try Data(contentsOf: url)
                guard let document = PDFDocument(data: data) else {
                    DispatchQueue.main.async { self?.fail("Failed to parse PDF data.") }
                    return
                }
                DispatchQueue.main.async {
                    guard let self = self else {
                        return
                    }
                    self.pdfView.document = document
                    self.notifyLoadComplete(document: document, data: data)
                    self.goToPage(self.initialPage?.intValue ?? 0)
                }
            } catch {
                DispatchQueue.main.async {
                    self?.fail("Failed to download PDF: \(error.localizedDescription)")
                }
            }
        }
    }

    private func fail(_ message: String) {
        status.show(.failed(message))
        onError?(["message": message])
    }

    /// The fingerprint of the file actually opened. Comment anchors are stored
    /// against it, so a different edition under the same book id can be told
    /// apart and left undrawn.
    private func notifyLoadComplete(document: PDFDocument, data: Data) {
        documentHash = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        status.show(.ready)
        scrubber.totalPages = document.pageCount
        scrubber.isHidden = document.pageCount == 0
        setNeedsLayout()
        onLoadComplete?([
            "totalPages": document.pageCount,
            "fileHash": documentHash,
        ])
        scheduleOverlayRefresh()
    }
}

// MARK: - Loading / error / empty

/// What sits over the page card when there is no page to show yet. Previously
/// three separate JS branches across PdfViewer and ManuscriptScreen; they are
/// one state machine now that the card is drawn natively.
private class ReaderStatusView: UIView {

    enum State {
        case loading
        case ready
        case failed(String)
        case empty
    }

    var onRetry: (() -> Void)?

    private let spinner = UIActivityIndicatorView(style: .large)
    private let icon = UIImageView()
    private let title = UILabel()
    private let subtitle = UILabel()
    private let retry = UIButton(type: .system)
    private let stack = UIStackView()

    override init(frame: CGRect) {
        super.init(frame: frame)
        build()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func build() {
        spinner.color = DS.Colors.primary

        icon.tintColor = DS.Colors.onSurfaceVariant
        icon.contentMode = .scaleAspectFit
        icon.translatesAutoresizingMaskIntoConstraints = false
        icon.heightAnchor.constraint(equalToConstant: 48).isActive = true

        title.font = DS.Fonts.semibold(18)
        title.textColor = DS.Colors.onSurface
        title.textAlignment = .center
        title.numberOfLines = 0

        subtitle.font = DS.Fonts.regular(14)
        subtitle.textColor = DS.Colors.onSurfaceVariant
        subtitle.textAlignment = .center
        subtitle.numberOfLines = 0

        retry.setTitle("Retry", for: .normal)
        retry.setTitleColor(DS.Colors.onPrimary, for: .normal)
        retry.titleLabel?.font = DS.Fonts.bold(16)
        retry.backgroundColor = DS.Colors.primary
        retry.layer.cornerRadius = 22
        retry.addTarget(self, action: #selector(tapRetry), for: .touchUpInside)
        retry.translatesAutoresizingMaskIntoConstraints = false
        retry.heightAnchor.constraint(equalToConstant: 44).isActive = true
        retry.widthAnchor.constraint(greaterThanOrEqualToConstant: 96).isActive = true

        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        [spinner, icon, title, subtitle, retry].forEach { stack.addArrangedSubview($0) }
        addSubview(stack)

        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 32),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -32),
        ])

        show(.loading)
    }

    func show(_ state: State) {
        switch state {
        case .loading:
            isHidden = false
            // Surface at 85% — the page stays faintly visible while it reloads.
            backgroundColor = DS.Colors.background.withAlphaComponent(0.85)
            spinner.startAnimating()
            spinner.isHidden = false
            icon.isHidden = true
            title.isHidden = true
            subtitle.isHidden = false
            subtitle.text = "Loading PDF…"
            subtitle.textColor = DS.Colors.onSurfaceVariant
            retry.isHidden = true
        case .ready:
            isHidden = true
            spinner.stopAnimating()
        case .failed(let message):
            isHidden = false
            backgroundColor = DS.Colors.background
            spinner.stopAnimating()
            spinner.isHidden = true
            icon.isHidden = true
            title.isHidden = true
            subtitle.isHidden = false
            subtitle.text = message
            subtitle.textColor = DS.Colors.error
            retry.isHidden = false
        case .empty:
            isHidden = false
            backgroundColor = DS.Colors.background
            spinner.stopAnimating()
            spinner.isHidden = true
            icon.isHidden = false
            icon.image = readerIcon("doc.text", size: 44, weight: .regular)
            title.isHidden = false
            title.text = "No manuscript available"
            subtitle.isHidden = false
            subtitle.text = "This book doesn't have a PDF file yet."
            subtitle.textColor = DS.Colors.onSurfaceVariant
            retry.isHidden = true
        }
    }

    @objc private func tapRetry() {
        onRetry?()
    }
}
