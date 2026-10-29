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
import Network
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
        guard builder.system != .main else {
            return
        }
        // Nothing selected means a tap on a comment or highlight, which opens
        // the thread sheet or the highlight menu. PDFKit's own menu for the
        // mark (Highlight, Remove, Add Note) came up over them, offering to
        // edit marks the reader draws.
        guard hasSelectedText else {
            builder.replaceChildren(ofMenu: .root) { _ in [] }
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

class RNPdfView: UIView, ReaderHeaderDelegate, ReaderScrubberDelegate, CommentSheetDelegate, UIGestureRecognizerDelegate {

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
    /// { open } whenever the comment sheet appears or goes.
    @objc var onCommentSheetChange: RCTDirectEventBlock?
    @objc var onManageComment: RCTDirectEventBlock?
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
    private var markTap: UITapGestureRecognizer?
    /// Whether the touch markTap is following started on a marked passage.
    private var touchIsOnMark = false
    /// When that touch came down, on the touch clock (system uptime).
    private var touchBegan: TimeInterval = 0
    /// Held longer than this, a touch is a press to select text, not a tap:
    /// above a tap's length, below the system's 0.5s press. Lifting the
    /// finger after one mustn't also open the thread under it.
    private static let longestTap: TimeInterval = 0.35
    private var documentHash: String = ""
    private var currentPageIndex: Int = 0
    private var addedHighlights: [(PDFPage, PDFAnnotation)] = []
    /// One passage fill, as drawn. Overlays are worked out again
    /// on every scroll, zoom and layout, but the marks only change when the
    /// threads, the highlights, the theme or the document do. Taking them off
    /// and putting them back each time made them flicker while PDFKit redrew.
    private struct Mark: Equatable {
        let page: Int
        let rect: CGRect
        let color: UIColor
    }
    private var wantedMarks: [(page: PDFPage, mark: Mark)] = []
    private var drawnMarks: (document: PDFDocument, theme: PageTheme, marks: [Mark])?
    /// Each dot with the page and page-space rect it is pinned to, so scrolling
    /// only has to move frames rather than rebuild the overlay.
    private var gutterDots: [(button: UIButton, page: PDFPage, rect: CGRect)] = []
    private var scrollObserver: NSKeyValueObservation?
    /// Every scroll view in the PDF view, for `paintBlankPages()`. Page
    /// turning swipes in the page view controller's own scroll view, not the
    /// one `scrollObserver` follows, so a page sliding in on iPad (where it
    /// takes longest to draw) kept PDFKit's white.
    private var paintObservers: [ObjectIdentifier: NSKeyValueObservation] = [:]
    private var overlayWork: DispatchWorkItem?
    private var lastLoadedURL: URL?
    /// Waits for a connection while the offline state shows, then downloads
    /// without waiting for Retry (specs/offline-first R7.2).
    private var reconnectMonitor: NWPathMonitor?
    /// Page mode (Settings → Page turning) as last applied to the PDFView.
    private var isPaged = false
    /// Settings → Page turning, as set; `isPaged` is what's applied.
    private var pagedSetting = false
    /// Settings → Page theme. Set before the document loads, as `pageMode` is.
    private var theme = PageTheme.paper
    /// The iPad layout (window ≥ 700pt), from JS.
    private var isLarge = false
    /// iPad scrolling (14f): pages fit to the window with one even gap round
    /// them. Page turning ("page") keeps the phone's paged reader on iPad too.
    private var usesLargeScroll: Bool { isLarge && !pagedSetting }
    /// How far in from the card's right edge a dot sits. Never past it: a
    /// landscape iPad page fills the card, and letting the dot into the outer
    /// margin put it half off. Further in on iPad, where 6pt on a page that
    /// wide reads as touching the edge. Wherever the page leaves a margin
    /// (iPad portrait, 14f), the dot still sits just beside the page.
    private var dotInset: CGFloat { isLarge ? 16 : 6 }
    /// iPad scrolling: the one gap between a page and anything next to it —
    /// the window edge, the header, the scrubber or the next page — in both
    /// orientations, kept as tight as the phone's 12pt card inset. Half is the
    /// container's inset, half PDFKit's page margin.
    private static let pageGap: CGFloat = 12
    /// Set when the layout switches, which needs a refit at an unchanged size.
    private var needsFit = false
    /// Whether the iPad scroll layout is what's on screen.
    private var appliedLargeScroll = false
    /// The book's trim (specs/reader-fit), as fractions of a page's crop box;
    /// nil while the book is shown whole.
    private var trim: CGRect?
    /// Stops the background search for a trim that's no longer wanted: a
    /// new book, a reload, the reader going away (R2.3).
    private final class Cancellation {
        var isCancelled = false
    }
    private var trimSearch: Cancellation?
    /// The text's distance from the page card's edge when trimmed, the same
    /// in every mode and orientation (R3.1).
    private var textGap: CGFloat { isLarge ? 40 : 20 }

    /// PDFKit's own page gaps, for going back to the phone layout.
    private var defaultPageBreakMargins = UIEdgeInsets.zero
    private var defaultScaleRange: (min: CGFloat, max: CGFloat) = (0, 0)
    /// True while the reader moves itself — a document going in, the jump to
    /// the saved page, a switch of page mode. PDFKit announces every page it
    /// passes through on the way (page 0 first, then the target), and passing
    /// those on made the scrubber jump about and reported page 0 to JS.
    private var isRepositioning = false
    /// Set when a document has gone in but the jump to `initialPage` hasn't
    /// been made yet — see `showDocument(_:)`.
    private var needsInitialJump = false

    // Comments are blue and personal highlights yellow: a pair that stays
    // distinct for the common colour-vision deficiencies. Commented passages
    // also carry a gutter dot, so colour is never the only cue. All three
    // blues are measured against the white page:
    //  - fill under black text: ≥15:1 at either opacity
    //  - unread dot (and its white count): 4.7:1
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
        // dark chrome; the paper should meet the card edge cleanly. In the
        // page theme's colour, so Night never shows white round the page.
        pdfView.backgroundColor = theme.paperColor
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical
        defaultPageBreakMargins = pdfView.pageBreakMargins
        defaultScaleRange = (pdfView.minScaleFactor, pdfView.maxScaleFactor)
        pdfView.onCommentAction = { [weak self] in self?.commentOnSelection() }
        pdfView.onHighlightAction = { [weak self] in self?.highlightSelection() }
        pageContainer.addSubview(pdfView)

        gutterLayer.backgroundColor = .clear
        // Over the page container rather than inside it, so on iPad a dot can
        // sit in the margin beside the page without being clipped.
        addSubview(gutterLayer)

        status.onRetry = { [weak self] in self?.reload() }
        pageContainer.addSubview(status)

        scrubber.isHidden = true
        scrubber.delegate = self
        addSubview(scrubber)

        sheet.delegate = self
        sheet.onVisibilityChange = { [weak self] open in
            self?.onCommentSheetChange?(["open": open])
        }
        addSubview(sheet)

        registerLegacyMenuItems()

        // A tap on a passage that is already marked: the reader's own
        // highlight offers Remove / Comment, a commented passage opens its
        // thread. Recognized alongside PDFKit's own gestures, never instead.
        let tap = UITapGestureRecognizer(target: self, action: #selector(handlePageTap(_:)))
        tap.delegate = self
        tap.cancelsTouchesInView = false
        pdfView.addGestureRecognizer(tap)
        markTap = tap

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
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleVisiblePagesChanged),
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
        trimSearch?.isCancelled = true
        NotificationCenter.default.removeObserver(self)
        scrollObserver?.invalidate()
        reconnectMonitor?.cancel()
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

        // Rotation, Split View and Stage Manager resize the page while a book
        // is open. PDFKit re-lays the document out on resize and would drift
        // off the page being read, so note the spot first and return to it.
        let previousContainerSize = pageContainer.bounds.size
        let anchor: PDFDestination? = (previousContainerSize != .zero && pdfView.document != nil && !needsInitialJump)
            ? pdfView.currentDestination
            : nil

        let top = header.frame.maxY
        let bottom = scrubber.isHidden ? bounds.height : scrubber.frame.minY
        // The phone keeps its 12pt card inset. iPad scrolling insets by half
        // the page gap; PDFKit's page margin adds the other half.
        let inset = usesLargeScroll ? RNPdfView.pageGap / 2 : 12
        let insetTop = usesLargeScroll ? top + inset : top
        let insetBottom = usesLargeScroll ? bottom - inset : bottom
        pageContainer.frame = CGRect(
            x: inset,
            y: insetTop,
            width: max(0, bounds.width - inset * 2),
            height: max(0, insetBottom - insetTop)
        )
        let resized = pageContainer.bounds.size != previousContainerSize
        let side = trimInset(across: pageContainer.bounds.width)
        pdfView.frame = pageContainer.bounds.insetBy(dx: side, dy: 0)
        if isPaged {
            // The page view controller doesn't refit on resize the way the
            // continuous view does. The floor goes first: set after, a fit
            // smaller than the last one (portrait to landscape) was held up at
            // the old floor and the page stayed zoomed in.
            let fit = pdfView.scaleFactorForSizeToFit
            if fit > 0 {
                pdfView.minScaleFactor = fit
                pdfView.maxScaleFactor = fit * 3
                pdfView.scaleFactor = fit
            }
        }
        if usesLargeScroll, needsFit || resized {
            needsFit = false
            // Pinch from fit (1×) up to 3×; a resize goes back to fit.
            let fit = fitWithFixedGap()
            if fit > 0 {
                pdfView.minScaleFactor = fit
                pdfView.maxScaleFactor = fit * 3
                pdfView.scaleFactor = fit
            }
        } else if !usesLargeScroll, !isPaged {
            // PDFKit's own floor lets a page shrink to a speck in the middle
            // of the card. No zooming out past the fit, as on iPad; a resize
            // (rotation) goes back to the fit, which the old floor would
            // otherwise hold it above.
            let fit = pdfView.scaleFactorForSizeToFit
            if fit > 0 {
                pdfView.minScaleFactor = fit
                pdfView.maxScaleFactor = fit * 3
                if resized {
                    pdfView.scaleFactor = fit
                }
            }
        }
        hideScrollIndicators(in: pdfView)
        gutterLayer.frame = pageContainer.frame
        status.frame = pageContainer.bounds
        sheet.frame = bounds

        if let anchor = anchor, resized {
            restore(anchor)
        }

        scheduleOverlayRefresh()
        applyInitialJumpIfReady()
    }

    /// Returns to a spot noted before a resize, one turn of the run loop later
    /// so PDFKit has finished laying the resized document out (the same
    /// reason the initial jump waits). Page reports are held until then.
    private func restore(_ anchor: PDFDestination) {
        isRepositioning = true
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                return
            }
            self.pdfView.go(to: anchor)
            self.isRepositioning = false
            self.reportPage(force: true)
            // The dots were placed for the old layout.
            self.scheduleOverlayRefresh()
        }
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
            NSLog("[RNPdfViewer] initialPage set: %@ (document loaded: %@)",
                  initialPage?.stringValue ?? "nil",
                  pdfView.document == nil ? "no" : "yes")
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
            pagedSetting = (pageMode as String?) == "page"
            applyLayoutKeepingPlace()
        }
    }

    /// "paper" (the default), "sepia" or "night", from Settings → Page theme
    /// (specs/page-theme). Read once when the book opens.
    @objc var pageTheme: NSString? {
        didSet {
            theme = PageTheme(pageTheme as String?)
            applySheet()
            // Normally set before the book loads. If it ever comes after, the
            // pages already drawn have to be drawn again.
            if let document = pdfView.document as? ThemedPdfDocument, document.theme != theme {
                document.theme = theme
                pdfView.accessibilityIgnoresInvertColors = theme == .night
                pdfView.layoutDocumentView()
                refreshOverlays()
            }
        }
    }

    /// The iPad layout (window ≥ 700pt, from JS's useLayout). Switches as the
    /// window crosses it — rotation, Split View — keeping the spot being read.
    @objc var largeLayout: NSNumber? {
        didSet {
            isLarge = largeLayout?.boolValue ?? false
            applyLayoutKeepingPlace()
        }
    }

    /// Applies whichever reader the settings now call for, staying on the
    /// passage being read.
    private func applyLayoutKeepingPlace() {
        let wantsLargeScroll = usesLargeScroll
        guard wantsLargeScroll != appliedLargeScroll || pagedSetting != isPaged else {
            return
        }
        guard pdfView.document != nil, !needsInitialJump else {
            // Not loaded yet: set up now, so the document goes straight into
            // the right mode instead of being re-laid out after.
            applyLayout()
            return
        }
        let anchor = pdfView.currentDestination
        isRepositioning = true
        applyLayout()
        layoutIfNeeded()
        if let anchor = anchor {
            restore(anchor)
        } else {
            isRepositioning = false
            reportPage(force: true)
        }
    }

    private func applyLayout() {
        appliedLargeScroll = usesLargeScroll
        // A new display mode gives PDFKit a new scroll view; the dots must
        // follow that one, not the old.
        resetScrollObserver()
        guard usesLargeScroll else {
            var margins = defaultPageBreakMargins
            if trim != nil {
                // The gap beside the text is the PDF view's inset, in screen
                // points; a page margin would add to it at every zoom.
                margins.left = 0
                margins.right = 0
            }
            pdfView.pageBreakMargins = margins
            pdfView.minScaleFactor = defaultScaleRange.min
            pdfView.maxScaleFactor = defaultScaleRange.max
            applyPageMode(pagedSetting)
            applySheet()
            return
        }
        isPaged = false
        pdfView.usePageViewController(false, withViewOptions: nil)
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical
        pdfView.displaysPageBreaks = true
        pdfView.autoScales = true
        applySheet()
        // Fit and gaps are worked out on the next layout, even at an
        // unchanged size.
        needsFit = true
        setNeedsLayout()
    }

    /// PDFKit's page margins are in page points, so they grow and shrink with
    /// the page: a 6pt margin was 13.5pt on screen at landscape's 2.25×, and
    /// 10pt in portrait. Sizing the margin as half the gap ÷ the scale keeps it
    /// 6pt on screen; the fit depends on the margin, so the two are solved
    /// together (it settles in a couple of rounds). Returns the fit scale.
    private func fitWithFixedGap() -> CGFloat {
        let half = RNPdfView.pageGap / 2
        var fit = pdfView.scaleFactorForSizeToFit
        for _ in 0..<4 where fit > 0 {
            let margin = half / fit
            let side = trim == nil ? margin : 0
            pdfView.pageBreakMargins = UIEdgeInsets(top: margin, left: side, bottom: margin, right: side)
            pdfView.layoutDocumentView()
            fit = pdfView.scaleFactorForSizeToFit
        }
        return fit
    }

    /// The page's surroundings. Untrimmed, as before trims: the phone's pages
    /// sit on their paper colour with a shadow when scrolling, the iPad's on
    /// the app's navy. Trimmed, the card is one sheet of the theme's paper,
    /// with no page edges or shadows in it (R4.1).
    private func applySheet() {
        let sheet = trim != nil
        pageContainer.backgroundColor = sheet ? theme.paperColor : .clear
        // The pages sit on the app's own ground on iPad, not on PDFKit's white.
        pdfView.backgroundColor = sheet || !appliedLargeScroll ? theme.paperColor : DS.Colors.background
        pdfView.pageShadowsEnabled = !sheet && !isPaged && !appliedLargeScroll
    }

    /// How far in from each side of the card the PDF view sits when trimmed,
    /// so a page fitted to the view's width puts its text `textGap` from the
    /// card's edge (R3.1). The shown page is the text plus `PageTrim.padding`
    /// on each side, which is in page points and so scales with the fit.
    private func trimInset(across width: CGFloat) -> CGFloat {
        guard trim != nil, let page = pdfView.currentPage ?? pdfView.document?.page(at: 0) else {
            return 0
        }
        let shown = page.bounds(for: .artBox).width
        let text = shown - PageTrim.padding * 2
        guard text > 0, width > textGap * 2 else {
            return 0
        }
        let scale = (width - textGap * 2) / text
        return max(0, (width - shown * scale) / 2)
    }

    /// A rect on a page in the gutter layer's space, which sits over the page
    /// container rather than inside it.
    private func gutterRect(_ rect: CGRect, on page: PDFPage) -> CGRect {
        gutterLayer.convert(pdfView.convert(rect, from: page), from: pdfView)
    }

    private func applyPageMode(_ paged: Bool) {
        isPaged = paged
        resetScrollObserver()
        pdfView.usePageViewController(paged, withViewOptions: nil)
        pdfView.displayMode = paged ? .singlePage : .singlePageContinuous
        pdfView.displayDirection = paged ? .horizontal : .vertical
        // A page at a time should be the whole card, not a sheet floating on
        // it with a shadow and a break margin around it.
        pdfView.displaysPageBreaks = !paged
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

    @objc private func handleVisiblePagesChanged() {
        observeScrollingForPaint(in: pdfView)
        paintBlankPages()
    }

    @objc private func handlePageChanged() {
        reportPage(force: false)
        paintBlankPages()
    }

    /// PDFKit backs each piece of a page with a white layer until the piece
    /// is drawn, so a fast scroll in Sepia or Night showed white pages before
    /// the theme came in (worse once trimmed pages were drawn larger,
    /// specs/reader-fit). Those layers are painted the paper colour as pages
    /// come into view. Nothing public sets that colour: this only reads and
    /// sets layer colours, and if PDFKit's layers change shape it finds
    /// nothing and the pieces are white as before.
    ///
    /// Page turning shows something else first: a small picture of the page
    /// that PDFKit draws without the theme (black on white) while the sharp
    /// page is drawn, about a second on iPad. That picture is re-tinted the
    /// same way the page is, so it shows in the theme, only blurred.
    private func paintBlankPages() {
        guard theme != .paper else {
            return
        }
        paint(whiteIn: pdfView.layer, depth: 0)
    }

    private func paint(whiteIn layer: CALayer, depth: Int) {
        guard depth < 14 else {
            return
        }
        for sublayer in layer.sublayers ?? [] {
            if let color = sublayer.backgroundColor, Self.isPureWhite(color) {
                sublayer.backgroundColor = theme.paperColor.cgColor
            }
            if sublayer.name == Self.previewLayerName {
                tintPreview(in: sublayer)
            }
            paint(whiteIn: sublayer, depth: depth + 1)
        }
    }

    /// What PDFKit calls the layer holding a page's quick preview.
    private static let previewLayerName = "backgroundLayer"
    /// Set on a preview layer to the image this reader tinted, so it's only
    /// done again when PDFKit puts in a new one.
    private static let tintedKey = "readpandaTintedPreview"

    private func tintPreview(in layer: CALayer) {
        guard let contents = layer.contents, CFGetTypeID(contents as CFTypeRef) == CGImage.typeID else {
            return
        }
        let image = contents as! CGImage
        if let tinted = layer.value(forKey: Self.tintedKey), tinted as AnyObject === image {
            return
        }
        guard let themed = Self.tint(image, theme) else {
            return
        }
        layer.contents = themed
        layer.setValue(themed, forKey: Self.tintedKey)
    }

    /// The page theme over a whole preview, pictures included: it's on
    /// screen for a moment, blurred, until the page itself is drawn.
    private static func tint(_ image: CGImage, _ theme: PageTheme) -> CGImage? {
        guard let context = CGContext(
            data: nil,
            width: image.width,
            height: image.height,
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
            return nil
        }
        let area = CGRect(x: 0, y: 0, width: image.width, height: image.height)
        context.draw(image, in: area)
        switch theme {
        case .sepia:
            context.setBlendMode(.multiply)
            context.setFillColor(DS.Colors.readerSepia.cgColor)
        case .night:
            // As on the page: the difference from white inverts.
            context.setBlendMode(.difference)
            context.setFillColor(UIColor.white.cgColor)
        case .paper:
            return nil
        }
        context.fill(area)
        return context.makeImage()
    }

    private static func isPureWhite(_ color: CGColor) -> Bool {
        var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
        UIColor(cgColor: color).getRed(&red, green: &green, blue: &blue, alpha: &alpha)
        return red > 0.99 && green > 0.99 && blue > 0.99 && alpha > 0.99
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
        // The button's frame in window points, so iPad can open the picker as
        // a popover anchored to it (15n). The phone ignores it.
        let anchor = header.convert(header.commentButtonFrame, to: nil)
        onRoomPickerRequested?([
            "x": anchor.minX,
            "y": anchor.minY,
            "width": anchor.width,
            "height": anchor.height,
        ])
    }

    func readerHeaderDidTapSearch(_ header: ReaderHeaderView) {
        onSearch?([:])
    }

    // MARK: - Scrubber

    /// "N waiting behind you" — take the reader to the earliest one in the
    /// book. Opening it marks it read, so tapping again moves on to the next.
    func readerScrubberDidTapWaiting(_ scrubber: ReaderScrubberView) {
        guard let thread = parsedThreads
            .filter({ $0.unreadCount > 0 })
            .min(by: { $0.page < $1.page }) else {
            return
        }
        openThread(anchorKey: thread.anchorKey)
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

    /// Delete, report, block, or drop a refused comment (report-block). JS
    /// asks, confirms and calls the API; new threads come back as a prop.
    func commentSheet(_ sheet: CommentSheetView, didChoose action: CommentAction, for comment: ReaderComment) {
        onManageComment?([
            "action": action.rawValue,
            "commentId": comment.id,
            "clientId": comment.clientId,
            "userId": comment.userId,
            "username": comment.username,
        ])
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

    private func resetScrollObserver() {
        scrollObserver?.invalidate()
        scrollObserver = nil
        paintObservers.values.forEach { $0.invalidate() }
        paintObservers.removeAll()
    }

    /// Follows any scroll view not followed yet; page turning makes new ones.
    private func observeScrollingForPaint(in view: UIView) {
        for subview in view.subviews {
            if let scrollView = subview as? UIScrollView, paintObservers[ObjectIdentifier(scrollView)] == nil {
                paintObservers[ObjectIdentifier(scrollView)] = scrollView.observe(\.contentOffset, options: [.new]) { [weak self] _, _ in
                    self?.paintBlankPages()
                }
            }
            observeScrollingForPaint(in: subview)
        }
    }

    /// The page scrolls continuously, so the dots have to follow it. PDFKit
    /// posts no notification for that, and rebuilding the overlay on every
    /// frame would be wasteful — so scrolling only moves the frames that are
    /// already there, and a rebuild happens when the threads themselves change.
    private func observeScrolling() {
        observeScrollingForPaint(in: pdfView)
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
            let lineInView = gutterRect(dot.rect, on: dot.page)
            let size = dot.button.frame.width
            dot.button.frame = CGRect(
                x: dotX(size: size, on: dot.page, in: field),
                y: lineInView.midY - size / 2,
                width: size,
                height: size
            )
            // A dot for a passage that has scrolled away is hidden rather than
            // removed, so it comes back without a rebuild. A page that isn't
            // showing (page turning) converts to a meaningless spot, so it's
            // hidden by page, not by position.
            dot.button.isHidden = lineInView.maxY < 0 || lineInView.minY > field.height
                || !pdfView.visiblePages.contains(dot.page)
        }
    }

    private func refreshOverlays() {
        wantedMarks.removeAll()
        gutterLayer.subviews.forEach { $0.removeFromSuperview() }
        gutterDots.removeAll()
        tapTargets.removeAll()
        observeScrolling()

        guard let document = pdfView.document else {
            clearHighlights()
            return
        }
        defer { applyMarks(in: document) }

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
        let index = pdfView.document?.index(for: page) ?? -1
        for rect in rects {
            wantedMarks.append((page, Mark(page: index, rect: rect, color: color)))
        }
    }

    /// Puts the marks this pass asked for on the page, unless they're the ones
    /// already there.
    private func applyMarks(in document: PDFDocument) {
        let marks = wantedMarks.map { $0.mark }
        if let drawn = drawnMarks, drawn.document === document, drawn.theme == theme, drawn.marks == marks {
            return
        }
        clearHighlights()
        for (page, mark) in wantedMarks {
            // Each theme's paper needs its own strength of fill, and Night its
            // own kind (specs/page-theme R6).
            let fill = theme.fillColor(mark.color)
            let annotation = theme == .night
                ? ThemedMark(bounds: mark.rect, color: fill)
                : PDFAnnotation(bounds: mark.rect, forType: .highlight, withProperties: nil)
            annotation.color = fill
            annotation.shouldDisplay = true
            annotation.shouldPrint = false
            page.addAnnotation(annotation)
            addedHighlights.append((page, annotation))
        }
        drawnMarks = (document, theme, marks)
    }

    private func clearHighlights() {
        for (page, annotation) in addedHighlights {
            page.removeAnnotation(annotation)
        }
        addedHighlights.removeAll()
        drawnMarks = nil
    }

    /// Where a dot of `size` goes across. Whole pages: beside the page, never
    /// past the card's edge. Trimmed: just past the text, in the gap (R5.3);
    /// the 22pt unread dot is wider than the phone's 20pt gap and reaches a
    /// few points past the card rather than over the words.
    private func dotX(size: CGFloat, on page: PDFPage, in field: CGRect) -> CGFloat {
        let pageInView = gutterRect(page.bounds(for: pdfView.displayBox), on: page)
        guard trim != nil else {
            return min(field.width - dotInset - size, pageInView.maxX + 6)
        }
        let textRight = pageInView.maxX - PageTrim.padding * pdfView.scaleFactor
        return textRight + 4
    }

    private func drawGutterDot(for thread: ReaderThread, firstLine: CGRect, on page: PDFPage) {
        let unread = thread.unreadCount
        let field = pageContainer.bounds
        let lineInView = gutterRect(firstLine, on: page)

        let size: CGFloat = unread > 0 ? 22 : 12
        let dot = UIButton(type: .custom)
        dot.frame = CGRect(
            x: dotX(size: size, on: page, in: field),
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
            || !pdfView.visiblePages.contains(page)
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

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
        if gestureRecognizer === markTap {
            touchIsOnMark = !marks(at: touch.location(in: pdfView)).isEmpty
            touchBegan = touch.timestamp
        }
        return true
    }

    /// Ours is only ever a quick tap on a marked passage. Anywhere else, or
    /// held long enough to select a word, it fails at once, so PDFKit's taps
    /// waiting on it (below) go ahead: clearing a selection is one of them.
    override func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        guard gestureRecognizer === markTap else {
            return super.gestureRecognizerShouldBegin(gestureRecognizer)
        }
        return touchIsOnMark
            && ProcessInfo.processInfo.systemUptime - touchBegan < RNPdfView.longestTap
    }

    /// On a marked passage PDFKit's own taps wait for ours, which wins there.
    /// Left alongside, PDFKit took the tap as one on its highlight annotation
    /// and put up its Highlight / Remove / Add Note menu over the thread
    /// sheet or our highlight menu. Scrolling, zooming and press-to-select
    /// never wait, and nowhere else does anything.
    func gestureRecognizer(
        _ gestureRecognizer: UIGestureRecognizer,
        shouldBeRequiredToFailBy otherGestureRecognizer: UIGestureRecognizer
    ) -> Bool {
        guard gestureRecognizer === markTap, touchIsOnMark,
            otherGestureRecognizer.view?.isDescendant(of: pdfView) == true
        else {
            return false
        }
        return !(otherGestureRecognizer is UIPanGestureRecognizer
            || otherGestureRecognizer is UIPinchGestureRecognizer
            || otherGestureRecognizer is UILongPressGestureRecognizer)
    }

    /// The marked passages under a point in the PDF view.
    private func marks(at point: CGPoint) -> [(target: TapTarget, page: PDFPage, rects: [CGRect])] {
        guard let page = pdfView.page(for: point, nearest: false) else {
            return []
        }
        let pagePoint = pdfView.convert(point, to: page)
        // Lines are tight; a couple of points of slack makes a tap on the
        // edge of a word still count.
        return tapTargets.filter { target in
            target.page == page && target.rects.contains { $0.insetBy(dx: -2, dy: -2).contains(pagePoint) }
        }
    }

    @objc private func handlePageTap(_ recognizer: UITapGestureRecognizer) {
        let hits = marks(at: recognizer.location(in: pdfView))
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
            NSLog("[RNPdfViewer] goToPage(%ld) skipped (document loaded: %@, pageCount: %ld)",
                  pageIndex,
                  pdfView.document == nil ? "no" : "yes",
                  pdfView.document?.pageCount ?? 0)
            return
        }
        NSLog("[RNPdfViewer] goToPage(%ld) of %ld", pageIndex, document.pageCount)
        pdfView.go(to: page)
    }

    /// Puts a freshly loaded document in and queues the jump to the saved
    /// page. The jump can't be made here: the scrubber appearing (and React
    /// Native's own sizing) resizes the PDFView in the next layout pass, and
    /// with autoScales on PDFKit re-lays the document out then and lands back
    /// on page 1. Page reports stay held until the jump, so page 1 never
    /// reaches JS as progress.
    private func showDocument(_ document: PDFDocument) {
        (document as? ThemedPdfDocument)?.theme = theme
        // Night is already inverted: Smart Invert on top would turn it back.
        pdfView.accessibilityIgnoresInvertColors = theme == .night
        isRepositioning = true
        needsInitialJump = true
        pdfView.document = document
        setNeedsLayout()
    }

    /// Makes the queued jump once the PDFView has its real size. Deferred one
    /// more turn of the run loop so PDFKit has finished its own layout of the
    /// resized view first.
    private func applyInitialJumpIfReady() {
        guard needsInitialJump,
            pdfView.document != nil,
            pdfView.bounds.width > 0,
            pdfView.bounds.height > 0
        else {
            return
        }
        needsInitialJump = false
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                return
            }
            // Read now rather than when queued, in case JS changed it since.
            self.goToPage(self.initialPage?.intValue ?? 0)
            self.isRepositioning = false
            self.reportPage(force: true)
        }
    }

    private func reload() {
        guard let url = lastLoadedURL else {
            return
        }
        loadPdf(from: url)
    }

    private func loadPdf(from url: URL) {
        lastLoadedURL = url
        stopWaitingForConnection()
        status.show(.loading)

        if url.isFileURL {
            if let data = try? Data(contentsOf: url), let document = ThemedPdfDocument(data: data) {
                prepareTrim(for: document, data: data)
                showDocument(document)
                notifyLoadComplete(document: document, data: data)
            } else {
                fail("Failed to load local PDF file.")
            }
            return
        }

        // A book read before opens from disk: no download, and it works
        // offline. Data(contentsOf:) skips URLCache entirely, so without this
        // every open fetched the whole file again.
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            if let cached = ManuscriptCache.read(url) {
                if let document = ThemedPdfDocument(data: cached) {
                    DispatchQueue.main.async { self?.open(document, data: cached) }
                    return
                }
                ManuscriptCache.remove(url)
            }
            DispatchQueue.main.async { self?.download(url) }
        }
    }

    /// Fetches a book that isn't on the device. Through URLSession rather
    /// than Data(contentsOf:), so a failure arrives as a URLError and "no
    /// connection" can be told apart from everything else (R7.1, R7.3).
    private func download(_ url: URL) {
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            let code = (response as? HTTPURLResponse)?.statusCode ?? 200
            let document = data.flatMap { ThemedPdfDocument(data: $0) }
            DispatchQueue.main.async {
                guard let self = self, url == self.lastLoadedURL else {
                    return
                }
                if let error = error as? URLError, ManuscriptCache.isOffline(error) {
                    self.failOffline("Failed to download PDF: \(error.localizedDescription)")
                } else if let error = error {
                    self.fail("Failed to download PDF: \(error.localizedDescription)")
                } else if !(200..<300).contains(code) {
                    self.fail("Failed to download PDF: HTTP \(code)")
                } else if let data = data, let document = document {
                    ManuscriptCache.write(data, for: url)
                    self.open(document, data: data)
                } else {
                    self.fail("Failed to parse PDF data.")
                }
            }
        }.resume()
    }

    private func open(_ document: PDFDocument, data: Data) {
        prepareTrim(for: document, data: data)
        showDocument(document)
        notifyLoadComplete(document: document, data: data)
    }

    // MARK: - Trimming the margins (specs/reader-fit)

    /// Before a book goes on screen: the trim remembered for this file, so the
    /// first frame is already trimmed (R2.2), or the book whole while a trim
    /// is looked for in the background (R2.1).
    private func prepareTrim(for document: PDFDocument, data: Data) {
        trimSearch?.isCancelled = true
        trimSearch = nil
        documentHash = Self.hash(of: data)
        switch PageTrim.remembered(for: documentHash) {
        case .trim(let box)?:
            setTrim(box, on: document)
        case .untrimmed?:
            setTrim(nil, on: document)
        case nil:
            setTrim(nil, on: document)
            searchForTrim(in: data, for: document)
        }
    }

    /// Shows `box` (nil: the whole page) on the document's pages and lays the
    /// reader out for it.
    private func setTrim(_ box: CGRect?, on document: PDFDocument) {
        trim = box
        PageTrim.apply(box, to: document)
        pdfView.displayBox = box == nil ? .cropBox : .artBox
        applyLayout()
        if pdfView.document === document {
            pdfView.layoutDocumentView()
        }
    }

    /// Looks for the trim off the main thread, at a priority below the
    /// reader's own work (R2.4), and switches to it if the same book is still
    /// open (R2.3). Found or not, the answer is remembered for next time.
    private func searchForTrim(in data: Data, for document: PDFDocument) {
        let search = Cancellation()
        trimSearch = search
        let hash = documentHash
        DispatchQueue.global(qos: .utility).async { [weak self] in
            // Its own copy: a PDFDocument isn't safe to share across threads,
            // and the one on screen belongs to the main thread.
            guard let copy = PDFDocument(data: data) else {
                return
            }
            let box = PageTrim.find(in: copy) { search.isCancelled }
            guard !search.isCancelled else {
                return
            }
            PageTrim.remember(box, for: hash)
            DispatchQueue.main.async {
                guard let self = self, !search.isCancelled, self.pdfView.document === document else {
                    return
                }
                self.trimSearch = nil
                self.switchTrim(to: box, on: document)
            }
        }
    }

    /// The switch from whole pages to trimmed ones, with the passage being
    /// read still on screen (R6.2) — the same way a rotation keeps its place.
    private func switchTrim(to box: CGRect?, on document: PDFDocument) {
        guard let box = box else {
            return
        }
        // Before the jump to the saved page, the jump itself lands right.
        let anchor = needsInitialJump ? nil : pdfView.currentDestination
        if anchor != nil {
            isRepositioning = true
        }
        setTrim(box, on: document)
        setNeedsLayout()
        layoutIfNeeded()
        if let anchor = anchor {
            restore(anchor)
        }
        scheduleOverlayRefresh()
    }

    private static func hash(of data: Data) -> String {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }

    /// Whatever went wrong, the reader sees "Couldn't open this book"; the
    /// detail goes to JS for the log, not the screen (R7.3).
    private func fail(_ message: String) {
        status.show(.failed)
        onError?(["message": message])
    }

    /// Not on the device, and no connection to fetch it (R7.1). Tries again
    /// by itself as soon as there is one (R7.2).
    private func failOffline(_ message: String) {
        status.show(.offline)
        onError?(["message": message, "offline": true])
        waitForConnection()
    }

    private func waitForConnection() {
        stopWaitingForConnection()
        let monitor = NWPathMonitor()
        monitor.pathUpdateHandler = { [weak self] path in
            guard path.status == .satisfied else {
                return
            }
            DispatchQueue.main.async {
                guard let self = self, self.reconnectMonitor === monitor else {
                    return
                }
                self.reload()
            }
        }
        reconnectMonitor = monitor
        monitor.start(queue: DispatchQueue.global(qos: .utility))
    }

    private func stopWaitingForConnection() {
        reconnectMonitor?.cancel()
        reconnectMonitor = nil
    }

    /// The fingerprint of the file actually opened. Comment anchors are stored
    /// against it, so a different edition under the same book id can be told
    /// apart and left undrawn.
    private func notifyLoadComplete(document: PDFDocument, data: Data) {
        documentHash = Self.hash(of: data)
        anchorRectCache.removeAll()
        status.show(.ready)
        scrubber.totalPages = document.pageCount
        scrubber.isHidden = document.pageCount == 0
        setNeedsLayout()
        onLoadComplete?([
            "totalPages": document.pageCount,
            "fileHash": documentHash,
            "chapters": Self.chapterStarts(in: document),
        ])
        scheduleOverlayRefresh()
    }

    /// The first page (0-based) of each chapter, from the PDF's outline — what
    /// the widgets' "Ch. 2" and chapter gauge are measured against. Many books
    /// nest their chapters under a single root entry (the title, or "Contents"),
    /// so a lone top-level entry is looked through. Empty when the PDF has no
    /// usable outline; the widgets then speak in pages.
    static func chapterStarts(in document: PDFDocument) -> [Int] {
        guard var level = document.outlineRoot else {
            return []
        }
        while level.numberOfChildren == 1, let only = level.child(at: 0), only.numberOfChildren > 1 {
            level = only
        }
        var starts = Set<Int>()
        for i in 0..<level.numberOfChildren {
            guard let page = level.child(at: i)?.destination?.page else {
                continue
            }
            let index = document.index(for: page)
            if index >= 0, index < document.pageCount {
                starts.insert(index)
            }
        }
        // Two entries or fewer isn't a table of contents worth counting in.
        return starts.count >= 2 ? starts.sorted() : []
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
        case failed
        /// Not downloaded yet and no connection (specs/offline-first R7.1).
        case offline
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

        // The insets yield while the view is still zero-width (before the
        // first layout pass), instead of UIKit breaking centerX and logging.
        let leading = stack.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 32)
        let trailing = stack.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -32)
        leading.priority = .init(999)
        trailing.priority = .init(999)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: centerYAnchor),
            leading,
            trailing,
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
        case .failed:
            // No system error or file name: that's for the log (R7.3).
            isHidden = false
            backgroundColor = DS.Colors.background
            spinner.stopAnimating()
            spinner.isHidden = true
            icon.isHidden = false
            icon.image = readerIcon("exclamationmark.triangle", size: 44, weight: .regular)
            title.isHidden = false
            title.text = "Couldn't open this book"
            subtitle.isHidden = true
            retry.isHidden = false
        case .offline:
            isHidden = false
            backgroundColor = DS.Colors.background
            spinner.stopAnimating()
            spinner.isHidden = true
            icon.isHidden = false
            icon.image = readerIcon("icloud.slash", size: 44, weight: .regular)
            title.isHidden = false
            title.text = "This book isn't downloaded yet"
            subtitle.isHidden = false
            subtitle.text = "Connect to the internet to open it. After that it stays on this phone."
            subtitle.textColor = DS.Colors.onSurfaceVariant
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


// MARK: - Shelf prefetch

/// The manuscript cache as JS sees it: the Reading shelf's books are fetched
/// on Wi-Fi so they open offline (specs/offline-first R6). The JS side
/// (useShelfPrefetch) decides which books and when; this only knows whether
/// one is already here and how to fetch one.
@objc(ManuscriptStore)
class ManuscriptStore: NSObject {

    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc(isCached:resolve:reject:)
    func isCached(_ urlString: String, resolve: @escaping RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        guard let url = URL(string: urlString) else {
            resolve(false)
            return
        }
        resolve(ManuscriptCache.contains(url))
    }

    /// Resolves true once it's on the device, false if it wasn't fetched.
    /// NetInfo can't see Low Data Mode, so the request itself refuses
    /// constrained and expensive (cellular) networks: iOS turns it down
    /// rather than spend the reader's data on a book they haven't opened
    /// (R6.2).
    @objc(prefetch:resolve:reject:)
    func prefetch(_ urlString: String, resolve: @escaping RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        guard let url = URL(string: urlString), !url.isFileURL else {
            resolve(false)
            return
        }
        if ManuscriptCache.contains(url) {
            resolve(true)
            return
        }
        var request = URLRequest(url: url)
        request.allowsConstrainedNetworkAccess = false
        request.allowsExpensiveNetworkAccess = false
        URLSession.shared.dataTask(with: request) { data, response, error in
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            // Only a real PDF goes in the cache: an expired link's error page
            // would otherwise be served as the book.
            guard error == nil, (200..<300).contains(code), let data = data, PDFDocument(data: data) != nil else {
                resolve(false)
                return
            }
            ManuscriptCache.write(data, for: url)
            resolve(true)
        }.resume()
    }
}


// MARK: - Manuscript cache

/// Downloaded manuscripts, kept in Caches so iOS can reclaim the space under
/// pressure. Keyed by host and path only: manuscript URLs are presigned, so
/// the query string changes on every fetch while the file behind it doesn't.
private enum ManuscriptCache {
    /// Past this, the least recently opened books are dropped first.
    static let maxBytes = 500 * 1024 * 1024

    private static let directory: URL? = {
        guard let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else {
            return nil
        }
        let dir = caches.appendingPathComponent("manuscripts", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }()

    private static func file(for url: URL) -> URL? {
        let key = "\(url.host ?? "")\(url.path)"
        let name = SHA256.hash(data: Data(key.utf8)).map { String(format: "%02x", $0) }.joined()
        return directory?.appendingPathComponent(name).appendingPathExtension("pdf")
    }

    /// The failures that mean "no connection", as opposed to a bad URL or
    /// server: these get the offline state and a retry on reconnect.
    static func isOffline(_ error: URLError) -> Bool {
        switch error.code {
        case .notConnectedToInternet, .networkConnectionLost, .dataNotAllowed,
             .cannotFindHost, .cannotConnectToHost, .timedOut, .internationalRoamingOff:
            return true
        default:
            return false
        }
    }

    static func contains(_ url: URL) -> Bool {
        guard let file = file(for: url) else {
            return false
        }
        return FileManager.default.fileExists(atPath: file.path)
    }

    static func read(_ url: URL) -> Data? {
        guard let file = file(for: url), let data = try? Data(contentsOf: file) else {
            return nil
        }
        // Mark it recently used, so pruning drops older books before this one.
        try? FileManager.default.setAttributes([.modificationDate: Date()], ofItemAtPath: file.path)
        return data
    }

    static func write(_ data: Data, for url: URL) {
        guard let file = file(for: url) else {
            return
        }
        try? data.write(to: file, options: .atomic)
        prune()
    }

    static func remove(_ url: URL) {
        guard let file = file(for: url) else {
            return
        }
        try? FileManager.default.removeItem(at: file)
    }

    private static func prune() {
        guard
            let dir = directory,
            let files = try? FileManager.default.contentsOfDirectory(
                at: dir,
                includingPropertiesForKeys: [.fileSizeKey, .contentModificationDateKey]
            )
        else {
            return
        }
        let entries = files.compactMap { file -> (URL, Int, Date)? in
            guard let values = try? file.resourceValues(forKeys: [.fileSizeKey, .contentModificationDateKey]) else {
                return nil
            }
            return (file, values.fileSize ?? 0, values.contentModificationDate ?? .distantPast)
        }
        var total = entries.reduce(0) { $0 + $1.1 }
        for (file, size, _) in entries.sorted(by: { $0.2 < $1.2 }) where total > maxBytes {
            try? FileManager.default.removeItem(at: file)
            total -= size
        }
    }
}
