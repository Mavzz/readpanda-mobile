//
//  RNPdfViewer.swift
//  ReadPanda
//
//  Created by Venkataramaaditya Nimmagadda on 15/03/26.
//

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

class RNPdfView: UIView {

    private let pdfView = PDFView()

    @objc var onPageChanged: RCTDirectEventBlock?
    @objc var onLoadComplete: RCTDirectEventBlock?
    @objc var onError: RCTDirectEventBlock?

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
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical
        addSubview(pdfView)

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handlePageChanged),
            name: .PDFViewPageChanged,
            object: pdfView
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        pdfView.frame = bounds
    }

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
    }

    private func loadPdf(from url: URL) {
        if url.isFileURL {
            if let document = PDFDocument(url: url) {
                pdfView.document = document
                notifyLoadComplete(document: document)
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
                        self?.notifyLoadComplete(document: document)
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

    private func notifyLoadComplete(document: PDFDocument) {
        onLoadComplete?([
            "totalPages": document.pageCount
        ])
    }
}
