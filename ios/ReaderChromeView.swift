//
//  ReaderChromeView.swift
//  ReadPanda
//
//  The furniture around the page: the header bar and the progress scrubber,
//  ported from ManuscriptScreen's own JSX and ReaderScrubber.js.
//
//  They live natively so that page position never has to cross the bridge to
//  be drawn. PDFKit posts a page change on every scroll tick; previously each
//  one became a JS render of the scrubber.
//

import UIKit

// MARK: - Header

protocol ReaderHeaderDelegate: AnyObject {
    func readerHeaderDidTapBack(_ header: ReaderHeaderView)
    func readerHeaderDidTapComment(_ header: ReaderHeaderView)
    func readerHeaderDidLongPressComment(_ header: ReaderHeaderView)
    func readerHeaderDidTapSearch(_ header: ReaderHeaderView)
}

class ReaderHeaderView: UIView {

    static let height: CGFloat = 60

    weak var delegate: ReaderHeaderDelegate?

    private let backButton = UIButton(type: .system)
    private let titleLabel = UILabel()
    private let commentButton = UIButton(type: .system)
    private let unreadDot = UIView()
    private let searchButton = UIButton(type: .system)

    var title: String = "" {
        didSet { titleLabel.text = title }
    }

    /// Solo reading has no audience, so it gets none of this chrome.
    var showsComment: Bool = false {
        didSet {
            commentButton.isHidden = !showsComment
            unreadDot.isHidden = !showsComment || unreadCount == 0
        }
    }

    var unreadCount: Int = 0 {
        didSet { unreadDot.isHidden = !showsComment || unreadCount == 0 }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        setup()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }

    private func setup() {
        backButton.setImage(readerIcon("chevron.left", size: 22), for: .normal)
        backButton.tintColor = DS.Colors.onSurface
        backButton.accessibilityLabel = "Back"
        backButton.addTarget(self, action: #selector(tapBack), for: .touchUpInside)

        titleLabel.font = DS.Fonts.bold(17)
        titleLabel.textColor = DS.Colors.onSurface
        titleLabel.numberOfLines = 1
        titleLabel.lineBreakMode = .byTruncatingTail

        commentButton.setImage(readerIcon("bubble.left.and.bubble.right", size: 19), for: .normal)
        commentButton.tintColor = DS.Colors.primary
        commentButton.accessibilityLabel = "Comment on this page"
        commentButton.isHidden = true
        commentButton.addTarget(self, action: #selector(tapComment), for: .touchUpInside)
        commentButton.addGestureRecognizer(
            UILongPressGestureRecognizer(target: self, action: #selector(longPressComment(_:)))
        )

        unreadDot.backgroundColor = DS.Colors.primary
        unreadDot.layer.cornerRadius = 3.5
        unreadDot.isHidden = true
        unreadDot.isUserInteractionEnabled = false

        searchButton.setImage(readerIcon("magnifyingglass", size: 18), for: .normal)
        searchButton.tintColor = DS.Colors.onSurface
        searchButton.accessibilityLabel = "Search"
        searchButton.addTarget(self, action: #selector(tapSearch), for: .touchUpInside)

        [backButton, titleLabel, commentButton, searchButton].forEach { addSubview($0) }
        addSubview(unreadDot)
    }

    /// Laid out by hand rather than with constraints: the row is four fixed
    /// 40pt slots and one label that takes what is left, which is a single
    /// subtraction here and a dozen constraints otherwise.
    override func layoutSubviews() {
        super.layoutSubviews()

        let slot: CGFloat = 40
        let padding: CGFloat = 8
        let y = (bounds.height - slot) / 2

        backButton.frame = CGRect(x: padding, y: y, width: slot, height: slot)
        searchButton.frame = CGRect(x: bounds.width - padding - slot, y: y, width: slot, height: slot)

        var titleRight = searchButton.frame.minX
        if showsComment {
            commentButton.frame = CGRect(x: searchButton.frame.minX - slot, y: y, width: slot, height: slot)
            unreadDot.frame = CGRect(x: commentButton.frame.maxX - 15, y: y + 8, width: 7, height: 7)
            titleRight = commentButton.frame.minX
        }

        let titleLeft = backButton.frame.maxX + 4
        titleLabel.frame = CGRect(
            x: titleLeft,
            y: 0,
            width: max(0, titleRight - titleLeft),
            height: bounds.height
        )
    }

    @objc private func tapBack() {
        delegate?.readerHeaderDidTapBack(self)
    }

    @objc private func tapComment() {
        delegate?.readerHeaderDidTapComment(self)
    }

    @objc private func longPressComment(_ gesture: UILongPressGestureRecognizer) {
        guard gesture.state == .began else {
            return
        }
        delegate?.readerHeaderDidLongPressComment(self)
    }

    @objc private func tapSearch() {
        delegate?.readerHeaderDidTapSearch(self)
    }
}

// MARK: - Scrubber

class ReaderScrubberView: UIView {

    /// Two ticks closer together than this read as one smudge rather than two
    /// marks, so they merge. Percent of the track.
    private static let minTickGapPct: CGFloat = 4

    private let track = UIView()
    private let fill = UIView()
    private let pageCounter = UILabel()
    private let waitingIcon = UIImageView()
    private let waitingLabel = UILabel()
    private let lockedLabel = UILabel()
    private var tickViews: [UIView] = []

    /// The scrubber is only as tall as its two rows; the host adds the safe
    /// area below it.
    static let contentHeight: CGFloat = 10 + 3 + 10 + 14

    var currentPage: Int = 0 { didSet { refresh() } }
    var totalPages: Int = 0 { didSet { refresh() } }
    var commentPages: [Int] = [] { didSet { rebuildTicks() } }
    var waitingCount: Int = 0 { didSet { refresh() } }
    var lockedCount: Int = 0 { didSet { refresh() } }

    override init(frame: CGRect) {
        super.init(frame: frame)
        setup()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }

    private func setup() {
        track.backgroundColor = DS.Colors.surfaceContainerHigh
        track.layer.cornerRadius = 1.5
        track.clipsToBounds = false
        addSubview(track)

        fill.backgroundColor = DS.Colors.primary
        fill.layer.cornerRadius = 1.5
        track.addSubview(fill)

        pageCounter.font = DS.Fonts.medium(11)
        pageCounter.textColor = DS.Colors.onSurfaceVariant
        addSubview(pageCounter)

        waitingIcon.image = readerIcon("bubble.left.fill", size: 9)
        waitingIcon.tintColor = DS.Colors.primary
        waitingIcon.contentMode = .scaleAspectFit
        addSubview(waitingIcon)

        waitingLabel.font = DS.Fonts.bold(11)
        waitingLabel.textColor = DS.Colors.primary
        addSubview(waitingLabel)

        lockedLabel.font = DS.Fonts.semibold(11)
        lockedLabel.textColor = DS.Colors.onSurfaceVariant
        lockedLabel.textAlignment = .right
        addSubview(lockedLabel)

        refresh()
    }

    private func refresh() {
        pageCounter.text = "\(currentPage + 1) / \(totalPages)"

        let waiting = waitingCount > 0
        waitingIcon.isHidden = !waiting
        waitingLabel.isHidden = !waiting
        waitingLabel.text = waiting ? "\(waitingCount) waiting behind you" : ""

        // Everything still ahead of the reader is one number and no more — no
        // page, no preview. The server never sends anything else.
        lockedLabel.text = lockedCount > 0 ? "\(lockedCount) later in the book" : ""

        setNeedsLayout()
    }

    private func rebuildTicks() {
        tickViews.forEach { $0.removeFromSuperview() }
        tickViews = Array(mergedTickPercents()).map { _ in
            let tick = UIView()
            tick.backgroundColor = DS.Colors.primary
            tick.layer.cornerRadius = 1
            track.addSubview(tick)
            return tick
        }
        setNeedsLayout()
    }

    private func mergedTickPercents() -> [CGFloat] {
        guard totalPages > 0 else {
            return []
        }
        let positions = Set(commentPages)
            .map { CGFloat($0) / CGFloat(totalPages) * 100 }
            .filter { $0 >= 0 && $0 <= 100 }
            .sorted()

        return positions.reduce(into: [CGFloat]()) { kept, pct in
            if kept.isEmpty || pct - kept[kept.count - 1] >= ReaderScrubberView.minTickGapPct {
                kept.append(pct)
            }
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()

        let sideInset: CGFloat = 20
        let width = bounds.width - sideInset * 2
        guard width > 0 else {
            return
        }

        track.frame = CGRect(x: sideInset, y: 10, width: width, height: 3)

        let progress = totalPages > 0 ? CGFloat(currentPage + 1) / CGFloat(totalPages) : 0
        fill.frame = CGRect(x: 0, y: 0, width: width * min(1, max(0, progress)), height: 3)

        for (tick, pct) in zip(tickViews, mergedTickPercents()) {
            tick.frame = CGRect(x: width * pct / 100, y: -3.5, width: 2, height: 10)
        }

        // The three slots share the row evenly so the middle one stays centred
        // even when the outer two are different lengths.
        let rowY = track.frame.maxY + 10
        let rowHeight: CGFloat = 14
        let slot = width / 3

        pageCounter.frame = CGRect(x: sideInset, y: rowY, width: slot, height: rowHeight)
        lockedLabel.frame = CGRect(x: sideInset + slot * 2, y: rowY, width: slot, height: rowHeight)

        let waitingTextWidth = waitingLabel.isHidden
            ? 0
            : waitingLabel.sizeThatFits(CGSize(width: slot, height: rowHeight)).width
        let iconWidth: CGFloat = waitingLabel.isHidden ? 0 : 11 + 4
        let waitingWidth = min(slot, waitingTextWidth + iconWidth)
        let waitingX = bounds.midX - waitingWidth / 2

        waitingIcon.frame = CGRect(x: waitingX, y: rowY + 1.5, width: 11, height: 11)
        waitingLabel.frame = CGRect(
            x: waitingX + iconWidth,
            y: rowY,
            width: max(0, waitingWidth - iconWidth),
            height: rowHeight
        )
    }
}
