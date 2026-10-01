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

/// PDFView subclass that adds "Highlight" and "Comment" to the selection menu.
///
/// iOS 16+ builds the text-selection menu through `UIMenuBuilder`, so the
/// actions are added in `buildMenu(with:)` — the legacy `UIMenuController`
/// items that used to carry "Comment" are no longer shown by PDFKit there.
/// iOS 15 still uses the responder-chain path, which is what
/// `canPerformAction` and the `@objc` selectors below are for.
class CommentablePDFView: PDFView {

    var onCommentAction: (() -> Void)?
    var onHighlightAction: (() -> Void)?
    /// Solo reading has no audience, so "Comment" is offered only in a room.
    /// Highlighting is personal and always available.
    var commentingEnabled = false

    private var hasSelectedText: Bool {
        guard let text = currentSelection?.string else {
            return false
        }
        return !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
        if action == #selector(commentOnSelection(_:)) {
            return commentingEnabled && hasSelectedText
        }
        if action == #selector(highlightSelection(_:)) {
            return hasSelectedText
        }
        return super.canPerformAction(action, withSender: sender)
    }

    @objc func commentOnSelection(_ sender: Any?) {
        onCommentAction?()
    }

    @objc func highlightSelection(_ sender: Any?) {
        onHighlightAction?()
    }

    override func buildMenu(with builder: UIMenuBuilder) {
        super.buildMenu(with: builder)
        // The main menu (iPad keyboard/Catalyst) isn't where passage actions
        // belong; the selection's edit menu is.
        guard builder.system != .main, hasSelectedText else {
            return
        }
        var actions: [UIMenuElement] = [
            UIAction(title: "Highlight", image: UIImage(systemName: "highlighter")) { [weak self] _ in
                self?.onHighlightAction?()
            },
        ]
        if commentingEnabled {
            actions.append(UIAction(title: "Comment", image: UIImage(systemName: "text.bubble")) { [weak self] _ in
                self?.onCommentAction?()
            })
        }
        // First in the menu, ahead of Copy — the reason the reader selected
        // text is far more often to mark it than to copy it.
        builder.insertChild(
            UIMenu(identifier: UIMenu.Identifier("com.readpanda.reader.passage"), options: .displayInline, children: actions),
            atStartOfMenu: .root
        )
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

class RNPdfView: UIView, ReaderHeaderDelegate, CommentSheetDelegate, UIGestureRecognizerDelegate {

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
    // Both lay themselves out with Auto Layout inside a frame set by hand.
    // Created at .zero, their padding couldn't fit and UIKit logged a wall of
    // broken constraints before the first real layout; a screen-sized start
    // is replaced by layoutSubviews before anything is drawn.
    private let status = ReaderStatusView(frame: UIScreen.main.bounds)
    private let sheet = CommentSheetView(frame: UIScreen.main.bounds)

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
    @objc var onCreateHighlight: RCTDirectEventBlock?
    @objc var onRemoveHighlight: RCTDirectEventBlock?

    private var parsedThreads: [ReaderThread] = []
    private var parsedHighlights: [ReaderHighlight] = []
    /// Where each drawn passage sits, so a tap on the page can tell which one
    /// it landed on. Rebuilt with the overlays.
    private var tapTargets: [(target: TapTarget, page: PDFPage, rects: [CGRect])] = []
    /// The highlight a tap menu is currently about.
    private var menuHighlightKey: String?
    private var highlightMenu: UIInteraction?
    private var documentHash: String = ""
    private var currentPageIndex: Int = 0
    private var addedHighlights: [(PDFPage, PDFAnnotation)] = []
    /// Each dot with the page and page-space rect it is pinned to, so scrolling
    /// only has to move frames rather than rebuild the overlay.
    private var gutterDots: [(button: UIButton, page: PDFPage, rect: CGRect)] = []
    private var scrollObserver: NSKeyValueObservation?
    private var overlayWork: DispatchWorkItem?
    private var lastLoadedURL: URL?
    /// Page mode (Settings → Page turning) as last applied to the PDFView.
    private var isPaged = false
    /// True while the reader moves itself — a document going in, the jump to
    /// the saved page, a switch of page mode. PDFKit announces every page it
    /// passes through on the way (page 0 first, then the target), and passing
    /// those on made the scrubber jump about and reported page 0 to JS.
    private var isRepositioning = false

    // Comments are blue and personal highlights yellow: a pair that stays
    // distinct for the common colour-vision deficiencies. Commented passages
    // are also underlined and carry a gutter dot, so colour is never the only
    // cue. All three blues are measured against the white page:
    //  - fill under black text: ≥15:1 at either opacity
    //  - underline, unread dot (and its white count): 4.7:1
    //  - read dot: 3.2:1 (WCAG non-text minimum is 3:1)
    private let commentFill = UIColor(rgb: 0x8ec5ff)
    private let commentInk = UIColor(rgb: 0x2f6fde)
    private let readDot = UIColor(rgb: 0x5b8def)
    /// Found passages, by page and text. A document's text never changes while
    /// it's open, so each anchor is searched for once, not on every scroll,
    /// zoom or prop update. Cleared when a new document loads.
    private var anchorRectCache: [String: [CGRect]] = [:]
    /// Personal highlights: a highlighter yellow, distinct from the peach of a
    /// commented passage so the reader's own marks never read as a conversation.
    private let personalTint = UIColor(rgb: 0xffe066)

    private enum TapTarget {
        case highlight(String)
        case thread(String)
    }

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
        pdfView.onHighlightAction = { [weak self] in self?.highlightSelection() }
        pageContainer.addSubview(pdfView)

        gutterLayer.backgroundColor = .clear
        pageContainer.addSubview(gutterLayer)

        status.onRetry = { [weak self] in self?.reload() }
        pageContainer.addSubview(status)

        scrubber.isHidden = true
        addSubview(scrubber)

        sheet.delegate = self
        addSubview(sheet)

        registerLegacyMenuItems()

        // A tap on a passage that is already marked: the reader's own
        // highlight offers Remove / Comment, a commented passage opens its
        // thread. Recognized alongside PDFKit's own gestures, never instead.
        let tap = UITapGestureRecognizer(target: self, action: #selector(handlePageTap(_:)))
        tap.delegate = self
        tap.cancelsTouchesInView = false
        pdfView.addGestureRecognizer(tap)

        if #available(iOS 16.0, *) {
            let interaction = UIEditMenuInteraction(delegate: self)
            pageContainer.addInteraction(interaction)
            highlightMenu = interaction
        }

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

    /// iOS 15 only. On 16+ the actions come from `buildMenu(with:)`, and
    /// registering these as well would show them twice.
    private func registerLegacyMenuItems() {
        if #available(iOS 16.0, *) {
            return
        }
        let items = [
            UIMenuItem(title: "Highlight", action: #selector(CommentablePDFView.highlightSelection(_:))),
            UIMenuItem(title: "Comment", action: #selector(CommentablePDFView.commentOnSelection(_:))),
        ]
        var existing = UIMenuController.shared.menuItems ?? []
        for item in items where !existing.contains(where: { $0.action == item.action }) {
            existing.append(item)
        }
        UIMenuController.shared.menuItems = existing
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
        // React Native mounts the view at 0×0 and sizes it a pass later.
        // Laying out now would squeeze the status view and comment sheet to
        // nothing and break their constraints.
        guard bounds.width > 0, bounds.height > 0 else {
            return
        }

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
        if isPaged {
            // The page view controller doesn't refit on resize the way the
            // continuous view does.
            pdfView.scaleFactor = pdfView.scaleFactorForSizeToFit
        }
        hideScrollIndicators(in: pdfView)
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

    /// The reader's own highlights on this book. Replacing the array redraws
    /// the page.
    @objc var highlights: NSArray? {
        didSet {
            parsedHighlights = ((highlights as? [NSDictionary]) ?? []).map { ReaderHighlight($0) }
            scheduleOverlayRefresh()
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

    /// "scroll" (the default) or "page", from Settings → Page turning
    /// (PROFILE_SETTINGS_7a_7b.md § 7b). Page mode swipes one page at a time
    /// left to right, like a book; the reader stays on the page it was on.
    @objc var pageMode: NSString? {
        didSet {
            let paged = (pageMode as String?) == "page"
            guard paged != isPaged else {
                return
            }
            guard let document = pdfView.document else {
                // Not loaded yet: set up now, so the document goes straight
                // into the right mode instead of being re-laid out after.
                applyPageMode(paged)
                return
            }
            let pageIndex = currentPageIndex
            reposition {
                applyPageMode(paged)
                if let page = document.page(at: pageIndex) {
                    pdfView.go(to: page)
                }
            }
        }
    }

    private func applyPageMode(_ paged: Bool) {
        isPaged = paged
        pdfView.usePageViewController(paged, withViewOptions: nil)
        pdfView.displayMode = paged ? .singlePage : .singlePageContinuous
        pdfView.displayDirection = paged ? .horizontal : .vertical
        // A page at a time should be the whole card, not a sheet floating on
        // it with a shadow and a break margin around it.
        pdfView.displaysPageBreaks = !paged
        pdfView.pageShadowsEnabled = !paged
        pdfView.autoScales = true
        setNeedsLayout()
    }

    /// Runs a move the reader makes on its own with page reports held back,
    /// then reports where it ended up — once.
    private func reposition(_ move: () -> Void) {
        isRepositioning = true
        move()
        isRepositioning = false
        reportPage(force: true)
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
        reportPage(force: false)
    }

    private func reportPage(force: Bool) {
        guard !isRepositioning,
            let currentPage = pdfView.currentPage,
            let document = pdfView.document
        else {
            return
        }
        let pageIndex = document.index(for: currentPage)
        // The page view controller re-announces the page it is already on as
        // it settles a swipe.
        guard force || pageIndex != currentPageIndex else {
            return
        }
        currentPageIndex = pageIndex
        scrubber.currentPage = pageIndex
        // The page view controller builds its scroll views lazily, as pages
        // are turned, so a layout pass alone doesn't reach them all.
        hideScrollIndicators(in: pdfView)
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

    /// The reader chose "Highlight" — hand the passage to JS, which saves it
    /// and pushes it back down as a highlight to draw.
    private func highlightSelection() {
        guard let selection = pdfView.currentSelection,
            let raw = selection.string?.trimmingCharacters(in: .whitespacesAndNewlines),
            !raw.isEmpty
        else {
            return
        }
        onCreateHighlight?([
            "page": pageIndex(of: selection),
            "anchorText": String(raw.prefix(RNPdfView.maxAnchorLength)),
            "bounds": normalizedBounds(for: selection).map { $0.payload },
            "fileHash": documentHash,
        ])
        clearSelection()
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

    /// The scrubber is the reader's one sense of place. PDFKit's own
    /// indicators — a grey bar under the page in page mode — would be a
    /// second, competing one.
    private func hideScrollIndicators(in view: UIView) {
        for subview in view.subviews {
            if let scrollView = subview as? UIScrollView {
                scrollView.showsHorizontalScrollIndicator = false
                scrollView.showsVerticalScrollIndicator = false
            }
            hideScrollIndicators(in: subview)
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
        tapTargets.removeAll()
        observeScrolling()

        guard let document = pdfView.document else {
            return
        }

        // The reader's own marks go down first, so a passage that is both
        // highlighted and commented shows the conversation tint on top.
        for highlight in parsedHighlights {
            guard highlight.page >= 0, highlight.page < document.pageCount,
                let page = document.page(at: highlight.page)
            else {
                continue
            }
            if !highlight.fileHash.isEmpty && !documentHash.isEmpty && highlight.fileHash != documentHash {
                continue
            }
            guard let rects = anchorRects(text: highlight.anchorText, bounds: highlight.bounds, on: page),
                !rects.isEmpty
            else {
                continue
            }
            drawHighlights(rects, on: page, color: personalTint.withAlphaComponent(0.45))
            tapTargets.append((target: .highlight(highlight.key), page: page, rects: rects))
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
            guard let rects = anchorRects(text: thread.anchorText, bounds: thread.bounds, on: page),
                !rects.isEmpty
            else {
                continue
            }

            drawHighlights(rects, on: page, color: commentFill.withAlphaComponent(thread.unreadCount > 0 ? 0.55 : 0.35))
            drawUnderlines(rects, on: page)
            drawGutterDot(for: thread, firstLine: rects[0], on: page)
            tapTargets.append((target: .thread(thread.anchorKey), page: page, rects: rects))
        }
    }

    /// The passage as it sits on the page today. The stored text is looked up
    /// first so a re-flowed or re-exported edition still anchors correctly;
    /// the saved rects are the fallback for when the words have really gone.
    private func anchorRects(text: String, bounds: [NormalizedRect], on page: PDFPage) -> [CGRect]? {
        if !text.isEmpty {
            let cacheKey = "\(pdfView.document?.index(for: page) ?? -1)|\(text)"
            if let cached = anchorRectCache[cacheKey] {
                return cached.isEmpty ? fallbackRects(bounds, on: page) : cached
            }
            let found = findSelection(of: text, on: page)?.selectionsByLine().map { $0.bounds(for: page) } ?? []
            // A miss is cached too (as empty), so a passage that has really
            // gone isn't searched for again on every refresh.
            anchorRectCache[cacheKey] = found
            if !found.isEmpty {
                return found
            }
        }
        return fallbackRects(bounds, on: page)
    }

    private func fallbackRects(_ bounds: [NormalizedRect], on page: PDFPage) -> [CGRect]? {
        guard !bounds.isEmpty else {
            return nil
        }
        let box = page.bounds(for: .cropBox)
        return bounds.map { $0.denormalized(in: box) }
    }

    /// Searches the one page the anchor is filed under. `document.findString`
    /// used to scan every page of the book for every anchor, on the main
    /// thread — the lag before highlights appeared on a long book.
    private func findSelection(of text: String, on page: PDFPage) -> PDFSelection? {
        guard let pageText = page.string else {
            return nil
        }
        let range = (pageText as NSString).range(of: text, options: [.caseInsensitive])
        guard range.location != NSNotFound else {
            return nil
        }
        return page.selection(for: range)
    }

    /// Runtime only. These annotations are never written back — the manuscript
    /// on disk is the author's file, not a scratch pad.
    private func drawHighlights(_ rects: [CGRect], on page: PDFPage, color: UIColor) {
        for rect in rects {
            let annotation = PDFAnnotation(bounds: rect, forType: .highlight, withProperties: nil)
            annotation.color = color
            annotation.shouldDisplay = true
            annotation.shouldPrint = false
            page.addAnnotation(annotation)
            addedHighlights.append((page, annotation))
        }
    }

    /// The non-colour cue for a commented passage.
    private func drawUnderlines(_ rects: [CGRect], on page: PDFPage) {
        for rect in rects {
            let annotation = PDFAnnotation(bounds: rect, forType: .underline, withProperties: nil)
            annotation.color = commentInk
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
            dot.backgroundColor = commentInk
            dot.setTitle(unread > 9 ? "9+" : "\(unread)", for: .normal)
            dot.setTitleColor(.white, for: .normal)
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

    // MARK: - Tapping a marked passage

    func gestureRecognizer(
        _ gestureRecognizer: UIGestureRecognizer,
        shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
    ) -> Bool {
        return true
    }

    @objc private func handlePageTap(_ recognizer: UITapGestureRecognizer) {
        let point = recognizer.location(in: pdfView)
        guard let page = pdfView.page(for: point, nearest: false) else {
            return
        }
        let pagePoint = pdfView.convert(point, to: page)
        // Lines are tight; a couple of points of slack makes a tap on the
        // edge of a word still count.
        let hits = tapTargets.filter { target in
            target.page == page && target.rects.contains { $0.insetBy(dx: -2, dy: -2).contains(pagePoint) }
        }
        // The reader's own highlight wins: its menu can still reach the
        // conversation through "Comment".
        if let hit = hits.first(where: { if case .highlight = $0.target { return true } else { return false } }),
            case .highlight(let key) = hit.target
        {
            showHighlightMenu(for: key, at: recognizer.location(in: pageContainer))
        } else if let hit = hits.first, case .thread(let anchorKey) = hit.target {
            openThread(anchorKey: anchorKey)
        }
    }

    private func showHighlightMenu(for key: String, at point: CGPoint) {
        menuHighlightKey = key
        if #available(iOS 16.0, *), let interaction = highlightMenu as? UIEditMenuInteraction {
            interaction.presentEditMenu(with: UIEditMenuConfiguration(identifier: nil, sourcePoint: point))
            return
        }
        // iOS 15: a plain action sheet.
        guard let controller = window?.rootViewController?.presentedViewController ?? window?.rootViewController else {
            return
        }
        let sheet = UIAlertController(title: nil, message: nil, preferredStyle: .actionSheet)
        for action in highlightMenuActions() {
            sheet.addAction(UIAlertAction(title: action.title, style: action.destructive ? .destructive : .default) { _ in
                action.handler()
            })
        }
        sheet.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        sheet.popoverPresentationController?.sourceView = pageContainer
        sheet.popoverPresentationController?.sourceRect = CGRect(origin: point, size: .zero)
        controller.present(sheet, animated: true)
    }

    /// The same two choices whichever way the menu is shown.
    private func highlightMenuActions() -> [(title: String, destructive: Bool, handler: () -> Void)] {
        guard let key = menuHighlightKey,
            let highlight = parsedHighlights.first(where: { $0.key == key })
        else {
            return []
        }
        var actions: [(title: String, destructive: Bool, handler: () -> Void)] = []
        if pdfView.commentingEnabled {
            actions.append((title: "Comment", destructive: false, handler: { [weak self] in
                self?.commentOn(highlight)
            }))
        }
        actions.append((title: "Remove highlight", destructive: true, handler: { [weak self] in
            self?.onRemoveHighlight?(["key": key])
        }))
        return actions
    }

    /// Commenting on a highlighted passage anchors to exactly the same words,
    /// so it joins the existing thread there if there is one.
    private func commentOn(_ highlight: ReaderHighlight) {
        sheet.open(target: .draft(
            page: highlight.page,
            anchorText: highlight.anchorText,
            bounds: highlight.bounds,
            fileHash: highlight.fileHash.isEmpty ? documentHash : highlight.fileHash
        ))
        refreshSheet()
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
                reposition {
                    pdfView.document = document
                    goToPage(initialPage?.intValue ?? 0)
                }
                notifyLoadComplete(document: document, data: data)
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
                    self.reposition {
                        self.pdfView.document = document
                        self.goToPage(self.initialPage?.intValue ?? 0)
                    }
                    self.notifyLoadComplete(document: document, data: data)
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
        anchorRectCache.removeAll()
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

@available(iOS 16.0, *)
extension RNPdfView: UIEditMenuInteractionDelegate {
    func editMenuInteraction(
        _ interaction: UIEditMenuInteraction,
        menuFor configuration: UIEditMenuConfiguration,
        suggestedActions: [UIMenuElement]
    ) -> UIMenu? {
        let actions = highlightMenuActions().map { action in
            UIAction(
                title: action.title,
                image: UIImage(systemName: action.destructive ? "trash" : "text.bubble"),
                attributes: action.destructive ? .destructive : []
            ) { _ in action.handler() }
        }
        return actions.isEmpty ? nil : UIMenu(children: actions)
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
