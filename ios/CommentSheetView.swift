//
//  CommentSheetView.swift
//  ReadPanda
//
//  The thread sheet (6b), ported from CommentThreadSheet.js.
//
//  One passage, everything said about it, and a way to add to it — opened from
//  a gutter dot, from the chrome icon (page-level, no quote), or straight from
//  a fresh selection. Replies stay one level deep on purpose: a conversation
//  about a sentence stays legible, and the reader never has to track where in
//  a tree they are.
//
//  It draws itself inside the reader rather than presenting a view controller.
//  A presented sheet would sit in its own window scene above the PDF, and the
//  passage under discussion is part of the conversation — it has to stay
//  visible, and the highlight behind the sheet has to keep tracking the page.
//

import UIKit

private let visibleReplies = 2

// MARK: - Avatar

private class AvatarView: UIView {
    private let label = UILabel()

    init(initials: String, size: CGFloat) {
        super.init(frame: CGRect(x: 0, y: 0, width: size, height: size))
        backgroundColor = DS.Colors.surfaceContainerHighest
        layer.cornerRadius = size / 2
        clipsToBounds = true

        label.text = initials
        label.font = DS.Fonts.bold(size == 30 ? 11 : 10)
        label.textColor = DS.Colors.onSurface
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        addSubview(label)

        translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            widthAnchor.constraint(equalToConstant: size),
            heightAnchor.constraint(equalToConstant: size),
            label.centerXAnchor.constraint(equalTo: centerXAnchor),
            label.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

// MARK: - One comment

private class CommentRowView: UIView {

    private let comment: ReaderComment
    private let isReply: Bool
    private let onLike: (ReaderComment) -> Void
    private let onReply: (ReaderComment) -> Void
    private let onRetry: (ReaderComment) -> Void

    init(
        comment: ReaderComment,
        isReply: Bool,
        onLike: @escaping (ReaderComment) -> Void,
        onReply: @escaping (ReaderComment) -> Void,
        onRetry: @escaping (ReaderComment) -> Void
    ) {
        self.comment = comment
        self.isReply = isReply
        self.onLike = onLike
        self.onReply = onReply
        self.onRetry = onRetry
        super.init(frame: .zero)
        build()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func build() {
        translatesAutoresizingMaskIntoConstraints = false

        let avatar = AvatarView(initials: comment.initials, size: isReply ? 26 : 30)

        let name = UILabel()
        name.text = comment.username
        name.font = DS.Fonts.extraBold(12)
        name.textColor = DS.Colors.onSurface
        name.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        let stamp = UILabel()
        stamp.text = "p. \(comment.page + 1) · \(readerRelativeTime(comment.createdAt))"
        stamp.font = DS.Fonts.semibold(10)
        stamp.textColor = DS.Colors.onSurfaceVariant
        stamp.setContentCompressionResistancePriority(.required, for: .horizontal)

        let meta = UIStackView(arrangedSubviews: [name, stamp])
        meta.axis = .horizontal
        meta.alignment = .center
        meta.spacing = 6

        if !comment.read {
            let dot = UIView()
            dot.backgroundColor = DS.Colors.primary
            dot.layer.cornerRadius = 3
            dot.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                dot.widthAnchor.constraint(equalToConstant: 6),
                dot.heightAnchor.constraint(equalToConstant: 6),
            ])
            meta.addArrangedSubview(dot)
        }

        let spacer = UIView()
        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
        meta.addArrangedSubview(spacer)

        let text = UILabel()
        text.text = comment.body
        text.font = DS.Fonts.medium(13)
        text.textColor = DS.Colors.onSurface
        text.numberOfLines = 0

        let body = UIStackView(arrangedSubviews: [meta, text])
        body.axis = .vertical
        body.spacing = 3
        body.addArrangedSubview(comment.failed ? failedRow() : actionsRow())

        let row = UIStackView(arrangedSubviews: [avatar, body])
        row.axis = .horizontal
        row.alignment = .top
        row.spacing = 10
        row.translatesAutoresizingMaskIntoConstraints = false
        addSubview(row)

        NSLayoutConstraint.activate([
            row.topAnchor.constraint(equalTo: topAnchor),
            row.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -16),
            row.leadingAnchor.constraint(equalTo: leadingAnchor, constant: isReply ? 40 : 0),
            row.trailingAnchor.constraint(equalTo: trailingAnchor),
        ])
    }

    /// What someone just typed is never thrown away silently — it stays on
    /// screen and offers to go again.
    private func failedRow() -> UIView {
        let icon = UIImageView(image: readerIcon("exclamationmark.circle", size: 11))
        icon.tintColor = DS.Colors.error
        icon.contentMode = .scaleAspectFit
        icon.translatesAutoresizingMaskIntoConstraints = false
        icon.widthAnchor.constraint(equalToConstant: 12).isActive = true

        let label = UILabel()
        label.text = "Couldn't send · Retry"
        label.font = DS.Fonts.bold(11)
        label.textColor = DS.Colors.error

        let stack = UIStackView(arrangedSubviews: [icon, label, UIView()])
        stack.axis = .horizontal
        stack.alignment = .center
        stack.spacing = 4
        stack.isLayoutMarginsRelativeArrangement = true
        stack.layoutMargins = UIEdgeInsets(top: 6, left: 0, bottom: 0, right: 0)
        stack.isUserInteractionEnabled = true
        stack.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(tapRetry)))
        return stack
    }

    private func actionsRow() -> UIView {
        let like = UIButton(type: .system)
        let liked = comment.likedByMe
        like.setImage(readerIcon(liked ? "heart.fill" : "heart", size: 12), for: .normal)
        like.tintColor = liked ? DS.Colors.primary : DS.Colors.onSurfaceVariant
        like.setTitle(comment.likes > 0 ? " \(comment.likes)" : nil, for: .normal)
        like.setTitleColor(liked ? DS.Colors.primary : DS.Colors.onSurfaceVariant, for: .normal)
        like.titleLabel?.font = DS.Fonts.bold(11)
        like.isEnabled = !comment.pending
        like.accessibilityLabel = liked ? "Remove like" : "Like"
        like.addTarget(self, action: #selector(tapLike), for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [like])
        stack.axis = .horizontal
        stack.alignment = .center
        stack.spacing = 16
        stack.isLayoutMarginsRelativeArrangement = true
        stack.layoutMargins = UIEdgeInsets(top: 6, left: 0, bottom: 0, right: 0)

        if !isReply {
            let reply = UIButton(type: .system)
            reply.setTitle("Reply", for: .normal)
            reply.setTitleColor(DS.Colors.onSurfaceVariant, for: .normal)
            reply.titleLabel?.font = DS.Fonts.bold(11)
            reply.addTarget(self, action: #selector(tapReply), for: .touchUpInside)
            stack.addArrangedSubview(reply)
        }

        if comment.pending {
            let spinner = UIActivityIndicatorView(style: .medium)
            spinner.color = DS.Colors.onSurfaceVariant
            spinner.startAnimating()
            stack.addArrangedSubview(spinner)
        }

        stack.addArrangedSubview(UIView())
        return stack
    }

    @objc private func tapLike() {
        onLike(comment)
    }

    @objc private func tapReply() {
        onReply(comment)
    }

    @objc private func tapRetry() {
        onRetry(comment)
    }
}

// MARK: - Sheet

protocol CommentSheetDelegate: AnyObject {
    func commentSheetDidClose(_ sheet: CommentSheetView)
    func commentSheet(_ sheet: CommentSheetView, didSubmit body: String, parentId: String?)
    func commentSheet(_ sheet: CommentSheetView, didLike comment: ReaderComment)
    func commentSheet(_ sheet: CommentSheetView, didRetry comment: ReaderComment)
}

class CommentSheetView: UIView, UITextViewDelegate {

    weak var delegate: CommentSheetDelegate?

    private(set) var target: SheetTarget?

    private let backdrop = UIView()
    private let container = UIView()
    private let grabber = UIView()
    private let headerTitle = UILabel()
    private let roomChip = UIView()
    private let roomChipLabel = UILabel()
    private let quoteBlock = UIView()
    private let quoteLabel = UILabel()
    private let scrollView = UIScrollView()
    private let listStack = UIStackView()
    private let emptyLabel = UILabel()
    private let replyingBar = UIView()
    private let replyingLabel = UILabel()
    private let composerInput = UITextView()
    private let placeholder = UILabel()
    private let sendButton = UIButton(type: .custom)
    private let sendIcon = UIImageView()
    private let sendSpinner = UIActivityIndicatorView(style: .medium)

    private var containerBottom: NSLayoutConstraint!
    private var inputHeight: NSLayoutConstraint!

    private var threads: [ReaderThread] = []
    private var roomName: String = ""
    private var submitting: Bool = false
    private var replyTo: ReaderComment?
    /// Roots the reader has asked to see every reply of, by comment id.
    private var expanded: Set<String> = []

    // MARK: Lifecycle

    override init(frame: CGRect) {
        super.init(frame: frame)
        build()
        observeKeyboard()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    private func build() {
        isHidden = true

        // The reader stays visible behind the sheet.
        backdrop.backgroundColor = DS.Colors.surfaceContainerLowest.withAlphaComponent(0.45)
        backdrop.translatesAutoresizingMaskIntoConstraints = false
        backdrop.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(tapBackdrop)))
        addSubview(backdrop)

        container.backgroundColor = DS.Colors.surfaceContainer
        container.layer.cornerRadius = DS.Radius.hero
        container.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
        container.translatesAutoresizingMaskIntoConstraints = false
        addSubview(container)

        grabber.backgroundColor = DS.Colors.surfaceContainerHighest
        grabber.layer.cornerRadius = 2

        headerTitle.font = DS.Fonts.extraBold(14)
        headerTitle.textColor = DS.Colors.onSurface

        buildRoomChip()
        buildQuoteBlock()
        buildList()
        buildReplyingBar()

        let header = UIStackView(arrangedSubviews: [headerTitle, roomChip])
        header.axis = .horizontal
        header.alignment = .center
        header.spacing = 10

        let composer = buildComposer()

        let stack = UIStackView(arrangedSubviews: [header, quoteBlock, scrollView, replyingBar, composer])
        stack.axis = .vertical
        stack.spacing = 0
        stack.setCustomSpacing(12, after: header)
        stack.setCustomSpacing(14, after: quoteBlock)
        stack.setCustomSpacing(8, after: scrollView)
        stack.setCustomSpacing(8, after: replyingBar)
        stack.translatesAutoresizingMaskIntoConstraints = false

        grabber.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(grabber)
        container.addSubview(stack)

        containerBottom = container.bottomAnchor.constraint(equalTo: bottomAnchor)

        NSLayoutConstraint.activate([
            backdrop.topAnchor.constraint(equalTo: topAnchor),
            backdrop.bottomAnchor.constraint(equalTo: bottomAnchor),
            backdrop.leadingAnchor.constraint(equalTo: leadingAnchor),
            backdrop.trailingAnchor.constraint(equalTo: trailingAnchor),

            container.leadingAnchor.constraint(equalTo: leadingAnchor),
            container.trailingAnchor.constraint(equalTo: trailingAnchor),
            containerBottom,
            container.heightAnchor.constraint(lessThanOrEqualTo: heightAnchor, multiplier: 0.62),
            container.topAnchor.constraint(greaterThanOrEqualTo: safeAreaLayoutGuide.topAnchor),

            grabber.topAnchor.constraint(equalTo: container.topAnchor, constant: 10),
            grabber.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            grabber.widthAnchor.constraint(equalToConstant: 36),
            grabber.heightAnchor.constraint(equalToConstant: 4),

            stack.topAnchor.constraint(equalTo: grabber.bottomAnchor, constant: 14),
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -20),
            stack.bottomAnchor.constraint(equalTo: container.safeAreaLayoutGuide.bottomAnchor, constant: -20),
        ])

        // Drag the grabber down to dismiss, the way a system sheet behaves.
        let pan = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
        container.addGestureRecognizer(pan)
    }

    private func buildRoomChip() {
        roomChip.backgroundColor = DS.Colors.surfaceContainerHighest
        roomChip.layer.cornerRadius = 11
        roomChip.translatesAutoresizingMaskIntoConstraints = false

        let icon = UIImageView(image: readerIcon("person.2.fill", size: 8))
        icon.tintColor = DS.Colors.primary
        icon.contentMode = .scaleAspectFit

        roomChipLabel.font = DS.Fonts.bold(10)
        roomChipLabel.textColor = DS.Colors.primary

        let stack = UIStackView(arrangedSubviews: [icon, roomChipLabel])
        stack.axis = .horizontal
        stack.alignment = .center
        stack.spacing = 4
        stack.translatesAutoresizingMaskIntoConstraints = false
        roomChip.addSubview(stack)

        NSLayoutConstraint.activate([
            roomChip.heightAnchor.constraint(equalToConstant: 22),
            roomChip.widthAnchor.constraint(lessThanOrEqualToConstant: 140),
            stack.leadingAnchor.constraint(equalTo: roomChip.leadingAnchor, constant: 8),
            stack.trailingAnchor.constraint(equalTo: roomChip.trailingAnchor, constant: -8),
            stack.centerYAnchor.constraint(equalTo: roomChip.centerYAnchor),
        ])
    }

    private func buildQuoteBlock() {
        quoteBlock.backgroundColor = DS.Colors.surfaceContainerLow
        quoteBlock.layer.cornerRadius = 12
        quoteBlock.layer.maskedCorners = [.layerMaxXMinYCorner, .layerMaxXMaxYCorner]

        let rule = UIView()
        rule.backgroundColor = DS.Colors.primary
        rule.translatesAutoresizingMaskIntoConstraints = false
        quoteBlock.addSubview(rule)

        quoteLabel.font = UIFont.italicSystemFont(ofSize: 11.5)
        quoteLabel.textColor = DS.Colors.onSurfaceVariant
        quoteLabel.numberOfLines = 4
        quoteLabel.translatesAutoresizingMaskIntoConstraints = false
        quoteBlock.addSubview(quoteLabel)

        NSLayoutConstraint.activate([
            rule.leadingAnchor.constraint(equalTo: quoteBlock.leadingAnchor),
            rule.topAnchor.constraint(equalTo: quoteBlock.topAnchor),
            rule.bottomAnchor.constraint(equalTo: quoteBlock.bottomAnchor),
            rule.widthAnchor.constraint(equalToConstant: 3),

            quoteLabel.leadingAnchor.constraint(equalTo: quoteBlock.leadingAnchor, constant: 12),
            quoteLabel.trailingAnchor.constraint(equalTo: quoteBlock.trailingAnchor, constant: -12),
            quoteLabel.topAnchor.constraint(equalTo: quoteBlock.topAnchor, constant: 10),
            quoteLabel.bottomAnchor.constraint(equalTo: quoteBlock.bottomAnchor, constant: -10),
        ])
    }

    private func buildList() {
        scrollView.showsVerticalScrollIndicator = false
        scrollView.keyboardDismissMode = .interactive
        scrollView.translatesAutoresizingMaskIntoConstraints = false

        listStack.axis = .vertical
        listStack.spacing = 0
        listStack.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(listStack)

        emptyLabel.text = "Nothing here yet — say the first thing about this passage."
        emptyLabel.font = DS.Fonts.medium(13)
        emptyLabel.textColor = DS.Colors.onSurfaceVariant
        emptyLabel.textAlignment = .center
        emptyLabel.numberOfLines = 0
        emptyLabel.translatesAutoresizingMaskIntoConstraints = false
        emptyLabel.heightAnchor.constraint(greaterThanOrEqualToConstant: 60).isActive = true

        // The list hugs its content until the 62% cap takes over, so a thread
        // with one comment gets a short sheet rather than a half-empty one.
        let hug = scrollView.heightAnchor.constraint(equalTo: listStack.heightAnchor)
        hug.priority = .defaultLow

        NSLayoutConstraint.activate([
            listStack.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor),
            listStack.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor),
            listStack.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor),
            listStack.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor),
            listStack.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor),
            hug,
        ])
    }

    private func buildReplyingBar() {
        replyingBar.backgroundColor = DS.Colors.surfaceContainerLow
        replyingBar.layer.cornerRadius = DS.Radius.sm

        replyingLabel.font = DS.Fonts.semibold(11)
        replyingLabel.textColor = DS.Colors.onSurfaceVariant

        let cancel = UIButton(type: .system)
        cancel.setImage(readerIcon("xmark", size: 12), for: .normal)
        cancel.tintColor = DS.Colors.onSurfaceVariant
        cancel.accessibilityLabel = "Cancel reply"
        cancel.addTarget(self, action: #selector(cancelReply), for: .touchUpInside)
        cancel.setContentHuggingPriority(.required, for: .horizontal)

        let stack = UIStackView(arrangedSubviews: [replyingLabel, cancel])
        stack.axis = .horizontal
        stack.alignment = .center
        stack.spacing = 8
        stack.translatesAutoresizingMaskIntoConstraints = false
        replyingBar.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: replyingBar.topAnchor, constant: 8),
            stack.bottomAnchor.constraint(equalTo: replyingBar.bottomAnchor, constant: -8),
            stack.leadingAnchor.constraint(equalTo: replyingBar.leadingAnchor, constant: 12),
            stack.trailingAnchor.constraint(equalTo: replyingBar.trailingAnchor, constant: -12),
        ])
    }

    private func buildComposer() -> UIView {
        composerInput.backgroundColor = DS.Colors.surfaceContainerHigh
        composerInput.layer.cornerRadius = 20
        composerInput.font = DS.Fonts.medium(13)
        composerInput.textColor = DS.Colors.onSurface
        composerInput.tintColor = DS.Colors.primary
        composerInput.textContainerInset = UIEdgeInsets(top: 11, left: 12, bottom: 11, right: 12)
        composerInput.delegate = self
        composerInput.accessibilityLabel = "Comment"
        composerInput.translatesAutoresizingMaskIntoConstraints = false

        placeholder.text = "Add to the thread…"
        placeholder.font = DS.Fonts.medium(13)
        placeholder.textColor = DS.Colors.onSurfaceVariant
        placeholder.translatesAutoresizingMaskIntoConstraints = false
        composerInput.addSubview(placeholder)

        sendButton.setBackgroundImage(
            readerGradientImage(
                size: CGSize(width: 40, height: 40),
                colors: [DS.Colors.primary, DS.Colors.primaryContainer],
                start: CGPoint(x: 0, y: 0),
                end: CGPoint(x: 1, y: 1)
            ),
            for: .normal
        )
        sendButton.layer.cornerRadius = 20
        sendButton.clipsToBounds = true
        sendButton.accessibilityLabel = "Post comment"
        sendButton.addTarget(self, action: #selector(tapSend), for: .touchUpInside)
        sendButton.translatesAutoresizingMaskIntoConstraints = false

        // The arrow is a subview this file owns rather than the button's own
        // `imageView`. UIButton creates that one lazily and inserts its layer
        // at index 0 — underneath whatever is already on the button — so the
        // glyph kept ending up buried under the gradient fill.
        sendIcon.image = readerIcon("arrow.up", size: 16, weight: .bold)
        sendIcon.tintColor = DS.Colors.onPrimary
        sendIcon.contentMode = .center
        sendIcon.isUserInteractionEnabled = false
        sendIcon.translatesAutoresizingMaskIntoConstraints = false
        sendButton.addSubview(sendIcon)

        sendSpinner.color = DS.Colors.onPrimary
        sendSpinner.hidesWhenStopped = true
        sendSpinner.translatesAutoresizingMaskIntoConstraints = false
        sendButton.addSubview(sendSpinner)

        let row = UIView()
        row.addSubview(composerInput)
        row.addSubview(sendButton)

        inputHeight = composerInput.heightAnchor.constraint(equalToConstant: 40)

        NSLayoutConstraint.activate([
            composerInput.leadingAnchor.constraint(equalTo: row.leadingAnchor),
            composerInput.topAnchor.constraint(equalTo: row.topAnchor),
            composerInput.bottomAnchor.constraint(equalTo: row.bottomAnchor),
            composerInput.trailingAnchor.constraint(equalTo: sendButton.leadingAnchor, constant: -10),
            inputHeight,

            placeholder.leadingAnchor.constraint(equalTo: composerInput.leadingAnchor, constant: 17),
            placeholder.topAnchor.constraint(equalTo: composerInput.topAnchor, constant: 11),

            sendButton.trailingAnchor.constraint(equalTo: row.trailingAnchor),
            sendButton.bottomAnchor.constraint(equalTo: row.bottomAnchor),
            sendButton.widthAnchor.constraint(equalToConstant: 40),
            sendButton.heightAnchor.constraint(equalToConstant: 40),

            sendIcon.centerXAnchor.constraint(equalTo: sendButton.centerXAnchor),
            sendIcon.centerYAnchor.constraint(equalTo: sendButton.centerYAnchor),

            sendSpinner.centerXAnchor.constraint(equalTo: sendButton.centerXAnchor),
            sendSpinner.centerYAnchor.constraint(equalTo: sendButton.centerYAnchor),
        ])

        return row
    }

    // MARK: Opening and closing

    /// Opens the sheet on a passage, resetting whatever the last one left
    /// behind: a draft aimed at one passage shouldn't follow the reader to the
    /// next one.
    func open(target: SheetTarget) {
        self.target = target
        replyTo = nil
        expanded = []
        composerInput.text = ""
        textViewDidChange(composerInput)
        scrollView.setContentOffset(.zero, animated: false)
        render()

        guard isHidden else {
            return
        }
        isHidden = false
        backdrop.alpha = 0
        layoutIfNeeded()
        container.transform = CGAffineTransform(translationX: 0, y: container.bounds.height)
        UIView.animate(withDuration: 0.28, delay: 0, options: [.curveEaseOut]) {
            self.backdrop.alpha = 1
            self.container.transform = .identity
        }
    }

    func close() {
        guard !isHidden else {
            return
        }
        composerInput.resignFirstResponder()
        UIView.animate(
            withDuration: 0.22,
            delay: 0,
            options: [.curveEaseIn],
            animations: {
                self.backdrop.alpha = 0
                self.container.transform = CGAffineTransform(translationX: 0, y: self.container.bounds.height)
            },
            completion: { _ in
                self.isHidden = true
                self.container.transform = .identity
                self.target = nil
            }
        )
    }

    var isOpen: Bool {
        return !isHidden
    }

    /// New data from the store. The composer's contents and the reply target
    /// survive it — a re-render mid-sentence must not eat what is being typed.
    func update(threads: [ReaderThread], roomName: String, submitting: Bool) {
        self.threads = threads
        self.roomName = roomName
        self.submitting = submitting
        guard isOpen else {
            return
        }
        render()
    }

    // MARK: Rendering

    private func render() {
        guard let target = target else {
            return
        }
        let thread = target.resolve(in: threads)
        let comments = thread?.comments ?? []
        let total = thread?.totalCount ?? 0
        let page = target.page(in: threads)
        let anchorText = target.anchorText(in: threads)

        headerTitle.text = "\(total) comment\(total == 1 ? "" : "s") · Page \(page + 1)"

        roomChip.isHidden = roomName.isEmpty
        roomChipLabel.text = roomName

        // Page-level threads have nothing to quote.
        quoteBlock.isHidden = anchorText.isEmpty
        quoteLabel.text = anchorText

        replyingBar.isHidden = replyTo == nil
        if let replyTo = replyTo {
            replyingLabel.text = "Replying to \(replyTo.username)"
        }

        sendSpinner.isHidden = !submitting
        if submitting {
            sendSpinner.startAnimating()
        } else {
            sendSpinner.stopAnimating()
        }
        sendIcon.isHidden = submitting
        refreshSendState()

        rebuildList(comments)
    }

    private func rebuildList(_ comments: [ReaderComment]) {
        let offset = scrollView.contentOffset
        listStack.arrangedSubviews.forEach {
            listStack.removeArrangedSubview($0)
            $0.removeFromSuperview()
        }

        guard !comments.isEmpty else {
            listStack.addArrangedSubview(emptyLabel)
            return
        }

        for comment in comments {
            listStack.addArrangedSubview(row(for: comment, isReply: false))

            let replies = comment.replies
            let shown = expanded.contains(comment.id) ? replies : Array(replies.prefix(visibleReplies))
            shown.forEach { listStack.addArrangedSubview(row(for: $0, isReply: true)) }

            let hidden = replies.count - shown.count
            if hidden > 0 {
                listStack.addArrangedSubview(moreRepliesRow(rootId: comment.id, hidden: hidden))
            }
        }

        layoutIfNeeded()
        scrollView.setContentOffset(
            CGPoint(x: 0, y: min(offset.y, max(0, scrollView.contentSize.height - scrollView.bounds.height))),
            animated: false
        )
    }

    private func row(for comment: ReaderComment, isReply: Bool) -> UIView {
        return CommentRowView(
            comment: comment,
            isReply: isReply,
            onLike: { [weak self] in
                guard let self = self else { return }
                self.delegate?.commentSheet(self, didLike: $0)
            },
            onReply: { [weak self] in
                self?.replyTo = $0
                self?.render()
                self?.composerInput.becomeFirstResponder()
            },
            onRetry: { [weak self] in
                guard let self = self else { return }
                self.delegate?.commentSheet(self, didRetry: $0)
            }
        )
    }

    private func moreRepliesRow(rootId: String, hidden: Int) -> UIView {
        let button = UIButton(type: .system)
        button.setTitle("\(hidden) more repl\(hidden == 1 ? "y" : "ies")", for: .normal)
        button.setTitleColor(DS.Colors.primary, for: .normal)
        button.titleLabel?.font = DS.Fonts.bold(11)
        button.contentHorizontalAlignment = .leading
        button.accessibilityIdentifier = rootId
        button.addTarget(self, action: #selector(tapMoreReplies(_:)), for: .touchUpInside)

        let wrapper = UIView()
        button.translatesAutoresizingMaskIntoConstraints = false
        wrapper.addSubview(button)
        NSLayoutConstraint.activate([
            button.leadingAnchor.constraint(equalTo: wrapper.leadingAnchor, constant: 40),
            button.trailingAnchor.constraint(lessThanOrEqualTo: wrapper.trailingAnchor),
            button.topAnchor.constraint(equalTo: wrapper.topAnchor),
            button.bottomAnchor.constraint(equalTo: wrapper.bottomAnchor, constant: -16),
        ])
        return wrapper
    }

    private func refreshSendState() {
        let ready = !composerInput.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !submitting
        sendButton.isEnabled = ready
        sendButton.alpha = ready ? 1 : 0.4
    }

    // MARK: Actions

    @objc private func tapBackdrop() {
        delegate?.commentSheetDidClose(self)
    }

    @objc private func cancelReply() {
        replyTo = nil
        render()
    }

    @objc private func tapMoreReplies(_ sender: UIButton) {
        guard let id = sender.accessibilityIdentifier else {
            return
        }
        expanded.insert(id)
        render()
    }

    @objc private func tapSend() {
        let body = composerInput.text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty, !submitting else {
            return
        }
        delegate?.commentSheet(self, didSubmit: body, parentId: replyTo?.id)
        composerInput.text = ""
        replyTo = nil
        textViewDidChange(composerInput)
        render()
    }

    @objc private func handlePan(_ gesture: UIPanGestureRecognizer) {
        let translation = gesture.translation(in: self).y
        switch gesture.state {
        case .changed:
            container.transform = CGAffineTransform(translationX: 0, y: max(0, translation))
        case .ended, .cancelled:
            if translation > 80 || gesture.velocity(in: self).y > 900 {
                delegate?.commentSheetDidClose(self)
            } else {
                UIView.animate(withDuration: 0.2) { self.container.transform = .identity }
            }
        default:
            break
        }
    }

    // MARK: Text input

    func textViewDidChange(_ textView: UITextView) {
        placeholder.isHidden = !textView.text.isEmpty
        let fitted = textView.sizeThatFits(CGSize(width: textView.bounds.width, height: .greatestFiniteMagnitude)).height
        inputHeight.constant = min(110, max(40, fitted))
        refreshSendState()
    }

    func textView(_ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String) -> Bool {
        let length = (textView.text as NSString).replacingCharacters(in: range, with: text).count
        return length <= 2000
    }

    // MARK: Keyboard

    private func observeKeyboard() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillChange(_:)),
            name: UIResponder.keyboardWillChangeFrameNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillHide(_:)),
            name: UIResponder.keyboardWillHideNotification,
            object: nil
        )
    }

    @objc private func keyboardWillChange(_ note: Notification) {
        guard isOpen,
            let frame = (note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue)?.cgRectValue
        else {
            return
        }
        let overlap = max(0, bounds.maxY - convert(frame, from: nil).minY)
        animateBottom(to: -overlap, with: note)
    }

    @objc private func keyboardWillHide(_ note: Notification) {
        animateBottom(to: 0, with: note)
    }

    private func animateBottom(to constant: CGFloat, with note: Notification) {
        containerBottom.constant = constant
        let duration = (note.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double) ?? 0.25
        UIView.animate(withDuration: duration) { self.layoutIfNeeded() }
    }
}
