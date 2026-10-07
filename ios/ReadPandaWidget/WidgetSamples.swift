//
//  WidgetSamples.swift
//  ReadPandaWidget
//
//  What the widget gallery and placeholders show before the app has written
//  anything, and what the previews render. The design review's own example:
//  Data Mining, page 31 of 746, with AI Learning.
//

import Foundation

extension WidgetState {
    private static let navy = ["#2e3a54", "#151d32"]
    private static let plum = ["#41333f", "#1c1826"]
    private static let forest = ["#27403c", "#131f24"]

    private static func millis(daysFromNow days: Int) -> Double {
        (Date().addingTimeInterval(Double(days) * 86_400).timeIntervalSince1970 * 1000).rounded()
    }

    private static func bucketBook(_ id: String, _ title: String, _ duotone: [String], _ state: String = "unread") -> BucketBook {
        BucketBook(id: id, title: title, coverFile: nil, duotone: duotone, state: state)
    }

    private static let sampleBooks = [
        WidgetBook(
            id: "sample",
            title: "Data Mining",
            page: 31,
            totalPages: 746,
            finished: false,
            lastReadAt: millis(daysFromNow: 0),
            roomId: "sample-room",
            roomIds: ["sample-room"],
            bucketId: "sample-bucket",
            chapters: [0, 22, 58, 96, 140, 190, 251, 318, 390, 466, 540, 618, 690],
            coverFile: nil,
            duotone: navy,
            friendAhead: FriendAhead(name: "Grace", pagesAhead: 24)
        ),
        WidgetBook(
            id: "sample-2",
            title: "The Pragmatic Programmer",
            page: 112,
            totalPages: 352,
            finished: false,
            lastReadAt: millis(daysFromNow: -2),
            roomId: nil,
            roomIds: [],
            bucketId: nil,
            chapters: [0, 30, 64, 101, 150, 199, 240, 289, 320],
            coverFile: nil,
            duotone: plum,
            friendAhead: nil
        ),
        WidgetBook(
            id: "sample-3",
            title: "Thinking in Systems",
            page: 8,
            totalPages: 240,
            finished: false,
            lastReadAt: millis(daysFromNow: -5),
            roomId: nil,
            roomIds: [],
            bucketId: nil,
            chapters: nil,
            coverFile: nil,
            duotone: forest,
            friendAhead: nil
        ),
    ]

    private static let sampleRoom = WidgetRoom(
        id: "sample-room",
        name: "AI Learning",
        bookId: "sample",
        bookTitle: "Data Mining",
        coverFile: nil,
        duotone: navy,
        memberInitials: ["G", "M", "R"],
        unlockedUnreadCount: 3,
        teaser: Teaser(author: "Grace", text: "page 29 gets wild…"),
        snippet: Snippet(author: "Grace", text: "The bit about overfitting on page 29 finally made it click for me.", page: 29),
        myPage: 31,
        medianPage: 118,
        totalPages: 746,
        lastActivityAt: nil,
        leader: FriendAhead(name: "Grace", pagesAhead: 24),
        schedule: RoomSchedule(targetPage: 140, startPage: 1, dueAt: millis(daysFromNow: 3))
    )

    private static let sampleBucket = WidgetBucket(
        id: "sample-bucket",
        name: "Machine learning",
        kind: "user",
        books: [
            bucketBook("sample", "Data Mining", navy, "reading"),
            bucketBook("b1", "Pattern Recognition", plum),
            bucketBook("b2", "Deep Learning", forest),
            bucketBook("b3", "The Elements of Statistical Learning", navy),
            bucketBook("b4", "Probabilistic Machine Learning", plum),
        ]
    )

    private static let sampleCurated = WidgetBucket(
        id: "sample-curated",
        name: "Staff picks",
        kind: "curated",
        books: [
            bucketBook("c1", "Piranesi", forest),
            bucketBook("c2", "Klara and the Sun", plum),
            bucketBook("c3", "The Overstory", navy),
            bucketBook("c4", "Pachinko", forest),
        ]
    )

    static let sample = WidgetState(
        books: sampleBooks,
        rooms: [sampleRoom],
        buckets: [sampleBucket],
        curated: sampleCurated,
        // ~3 h for the rest of Data Mining.
        paceMinPerPage: 0.25,
        lastFinished: nil,
        streak: 6,
        updatedAt: nil
    )

    /// 13e: a book finished yesterday, nothing else on the go.
    static let sampleBetweenBooks = WidgetState(
        books: [
            WidgetBook(
                id: "sample",
                title: "Data Mining",
                page: 746,
                totalPages: 746,
                finished: true,
                lastReadAt: millis(daysFromNow: -1),
                roomId: nil,
                roomIds: [],
                bucketId: "sample-bucket",
                chapters: nil,
                coverFile: nil,
                duotone: navy,
                friendAhead: nil
            ),
        ],
        rooms: [],
        buckets: [sampleBucket],
        curated: sampleCurated,
        paceMinPerPage: 0.25,
        lastFinished: LastFinished(bookId: "sample", title: "Data Mining", finishedAt: millis(daysFromNow: -1), bucketId: "sample-bucket"),
        streak: 0,
        updatedAt: nil
    )
}
