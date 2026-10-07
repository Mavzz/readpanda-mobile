//
//  WidgetIntents.swift
//  ReadPandaWidget
//
//  What the widgets' edit sheets offer. The entity lists are exactly what the
//  app last wrote, so the sheet never offers something the widget can't show.
//

import AppIntents
import WidgetKit

// MARK: - Entities

struct RoomEntity: AppEntity {
    let id: String
    let name: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Room"
    static var defaultQuery = RoomQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

struct RoomQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [RoomEntity] {
        allRooms().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [RoomEntity] {
        allRooms()
    }

    private func allRooms() -> [RoomEntity] {
        (WidgetState.load().rooms ?? []).map { RoomEntity(id: $0.id, name: $0.name) }
    }
}

struct BookEntity: AppEntity {
    let id: String
    let title: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Book"
    static var defaultQuery = BookQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)")
    }
}

/// The shelf, most recently opened first.
struct BookQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [BookEntity] {
        allBooks().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [BookEntity] {
        allBooks()
    }

    private func allBooks() -> [BookEntity] {
        WidgetState.load().shelf.map { BookEntity(id: $0.id, title: $0.title) }
    }
}

struct BucketEntity: AppEntity {
    let id: String
    let name: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Bucket"
    static var defaultQuery = BucketQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

struct BucketQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [BucketEntity] {
        allBuckets().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [BucketEntity] {
        allBuckets()
    }

    private func allBuckets() -> [BucketEntity] {
        (WidgetState.load().buckets ?? []).map { BucketEntity(id: $0.id, name: $0.name) }
    }
}

// MARK: - Which book (13a, 13b, 13d, 13f)

enum BookPinKind: String, AppEnum {
    case recent
    case book
    case room
    case bucket

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Book to show"
    static var caseDisplayRepresentations: [BookPinKind: DisplayRepresentation] = [
        .recent: "Last opened",
        .book: "A book",
        .room: "A room's book",
        .bucket: "From a bucket",
    ]
}

struct BookWidgetIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Book"
    static var description = IntentDescription("Follow the book you opened last, or pin one.")

    @Parameter(title: "Show", default: .recent)
    var kind: BookPinKind

    @Parameter(title: "Book")
    var book: BookEntity?

    @Parameter(title: "Room")
    var room: RoomEntity?

    @Parameter(title: "Bucket")
    var bucket: BucketEntity?

    static var parameterSummary: some ParameterSummary {
        // Explicit roots: older Swift compilers (CI's Xcode) can't infer them.
        Switch(\BookWidgetIntent.$kind) {
            Case(.book) {
                Summary("Show \(\BookWidgetIntent.$kind): \(\BookWidgetIntent.$book)")
            }
            Case(.room) {
                Summary("Show \(\BookWidgetIntent.$kind): \(\BookWidgetIntent.$room)")
            }
            Case(.bucket) {
                Summary("Show \(\BookWidgetIntent.$kind): \(\BookWidgetIntent.$bucket)")
            }
            DefaultCase {
                Summary("Show \(\BookWidgetIntent.$kind)")
            }
        }
    }

    /// What the edit sheet pinned. A kind left without its pick follows the
    /// last-opened book.
    var pin: BookPin {
        switch kind {
        case .recent:
            return .recent
        case .book:
            return book.map { .book($0.id) } ?? .recent
        case .room:
            return room.map { .room($0.id) } ?? .recent
        case .bucket:
            return bucket.map { .bucket($0.id) } ?? .recent
        }
    }

    var pinnedRoomId: String? {
        kind == .room ? room?.id : nil
    }
}
