//
//  WidgetBridge.swift
//  ReadPanda
//
//  Hands the home-screen widget (ios/ReadPandaWidget) what it shows. JS builds
//  the state from its stores (src/widget/widgetState.js); this writes it into
//  the shared App Group and reloads the widget.
//
//  Covers are fetched here, not in the extension: widgets have a tight memory
//  budget and no business on the network. Each cover is downscaled once and
//  kept in the group container under a name derived from its URL, so the
//  widget only ever reads a small local file.
//

import CryptoKit
import Foundation
import ImageIO
import React
import UniformTypeIdentifiers
import WidgetKit

@objc(WidgetBridge)
class WidgetBridge: NSObject {

    private static let appGroup = "group.com.readpanda.app"
    private static let stateFile = "widget-state.json"
    private static let coversFolder = "Covers"
    /// Plenty for a 104pt-wide cover at 3x, and small enough for the widget's
    /// memory limit.
    private static let coverMaxPixels = 360

    /// Writes happen in order, off the main thread.
    private let queue = DispatchQueue(label: "com.readpanda.widget-bridge")

    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc(update:)
    func update(_ state: NSDictionary) {
        queue.async { [weak self] in
            self?.write(state)
        }
    }

    /// Sign-out: nothing of the previous reader stays on the home screen.
    @objc func clear() {
        queue.async {
            guard let container = Self.container else {
                return
            }
            try? FileManager.default.removeItem(at: container.appendingPathComponent(Self.stateFile))
            try? FileManager.default.removeItem(at: container.appendingPathComponent(Self.coversFolder))
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    // MARK: - Writing

    private static var container: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)
    }

    private func write(_ state: NSDictionary) {
        guard let container = Self.container else {
            NSLog("WidgetBridge: App Group %@ is unavailable", Self.appGroup)
            return
        }
        let covers = container.appendingPathComponent(Self.coversFolder)
        try? FileManager.default.createDirectory(at: covers, withIntermediateDirectories: true)

        var root = (state as? [String: Any]) ?? [:]
        var missing: [(url: URL, file: String)] = []

        // Point each record at its cached cover, noting the ones still to fetch.
        func attachCover(_ record: [String: Any]) -> [String: Any] {
            var record = record
            guard let raw = record["coverUrl"] as? String, !raw.isEmpty, let url = URL(string: raw) else {
                return record
            }
            let file = Self.coverFileName(for: raw)
            if FileManager.default.fileExists(atPath: covers.appendingPathComponent(file).path) {
                record["coverFile"] = file
            } else if !missing.contains(where: { $0.file == file }) {
                missing.append((url: url, file: file))
            }
            return record
        }

        if let book = root["currentBook"] as? [String: Any] {
            root["currentBook"] = attachCover(book)
        }
        if let rooms = root["rooms"] as? [[String: Any]] {
            root["rooms"] = rooms.map(attachCover)
        }

        save(root, to: container)
        pruneCovers(in: covers, keeping: Self.referencedCovers(in: root) + missing.map { $0.file })

        guard !missing.isEmpty else {
            return
        }
        // Draw now without the new covers, then again once they've landed.
        let group = DispatchGroup()
        for item in missing {
            group.enter()
            URLSession.shared.dataTask(with: item.url) { data, _, _ in
                defer { group.leave() }
                guard let data, let small = Self.downscaled(data) else {
                    return
                }
                try? small.write(to: covers.appendingPathComponent(item.file), options: .atomic)
            }.resume()
        }
        group.notify(queue: queue) { [weak self] in
            self?.write(state)
        }
    }

    private func save(_ root: [String: Any], to container: URL) {
        guard JSONSerialization.isValidJSONObject(root),
            let data = try? JSONSerialization.data(withJSONObject: root)
        else {
            NSLog("WidgetBridge: state is not valid JSON")
            return
        }
        try? data.write(to: container.appendingPathComponent(Self.stateFile), options: .atomic)
        WidgetCenter.shared.reloadAllTimelines()
    }

    // MARK: - Covers

    private static func coverFileName(for url: String) -> String {
        let digest = SHA256.hash(data: Data(url.utf8)).map { String(format: "%02x", $0) }.joined()
        return String(digest.prefix(24)) + ".jpg"
    }

    private static func referencedCovers(in root: [String: Any]) -> [String] {
        var files: [String] = []
        if let file = (root["currentBook"] as? [String: Any])?["coverFile"] as? String {
            files.append(file)
        }
        for room in (root["rooms"] as? [[String: Any]]) ?? [] {
            if let file = room["coverFile"] as? String {
                files.append(file)
            }
        }
        return files
    }

    /// Covers for books no longer on the widget are dropped, so the container
    /// doesn't grow with every book ever opened.
    private func pruneCovers(in folder: URL, keeping: [String]) {
        let keep = Set(keeping)
        let existing = (try? FileManager.default.contentsOfDirectory(atPath: folder.path)) ?? []
        for file in existing where !keep.contains(file) {
            try? FileManager.default.removeItem(at: folder.appendingPathComponent(file))
        }
    }

    private static func downscaled(_ data: Data) -> Data? {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil) else {
            return nil
        }
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: coverMaxPixels,
        ]
        guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
            return nil
        }
        let output = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(output, UTType.jpeg.identifier as CFString, 1, nil) else {
            return nil
        }
        CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: 0.85] as CFDictionary)
        return CGImageDestinationFinalize(destination) ? output as Data : nil
    }
}
