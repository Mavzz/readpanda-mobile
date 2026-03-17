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

    private func loadPdf(from url: URL) {
        if url.isFileURL {
            if let document = PDFDocument(url: url) {
                pdfView.document = document
            }
        } else {
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                guard let data = try? Data(contentsOf: url),
                    let document = PDFDocument(data: data)
                else {
                    return
                }
                DispatchQueue.main.async {
                    self?.pdfView.document = document
                }
            }
        }
    }
}

