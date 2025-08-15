//
//  RNPdfViewer.swift
//  ReadPanda
//
//  Created by Venkataramaaditya Nimmagadda on 29/07/25.
//

// RNPdfViewer.swift
import UIKit
import PDFKit

@objc(RNPdfViewer)
class RNPdfViewer: UIView {

    private var pdfView: PDFView!
    private var url: URL?
    
    @objc var onPdfLoadStart: RCTBubblingEventBlock?
    @objc var onPdfLoadComplete: RCTBubblingEventBlock?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupPdfView()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupPdfView() {
        pdfView = PDFView()
        pdfView.translatesAutoresizingMaskIntoConstraints = false
        self.addSubview(pdfView)

        NSLayoutConstraint.activate([
            pdfView.topAnchor.constraint(equalTo: self.topAnchor),
            pdfView.leadingAnchor.constraint(equalTo: self.leadingAnchor),
            pdfView.trailingAnchor.constraint(equalTo: self.trailingAnchor),
            pdfView.bottomAnchor.constraint(equalTo: self.bottomAnchor)
        ])

        // Configure PDFView properties (optional)
        pdfView.autoScales = true
        pdfView.displayMode = .singlePageContinuous
        pdfView.displaysPageBreaks = true
    }

    // This method will be called from React Native to set the PDF URL
    @objc func setPdfUrl(_ urlString: String) {
        if let newURL = URL(string: urlString) {
            self.url = newURL
            
            if let onPdfLoadStart = self.onPdfLoadStart {
                onPdfLoadStart([:])
            }
            
            DispatchQueue.global(qos: .userInitiated).async {
                if let document = PDFDocument(url: newURL) {
                    DispatchQueue.main.async {
                        self.pdfView.document = document
                        if let onPdfLoadComplete = self.onPdfLoadComplete {
                            onPdfLoadComplete([:])
                        }
                        print("PDF loaded from URL: \(newURL.absoluteString)")
                    }
                } else {
                    DispatchQueue.main.async {
                        if let onPdfLoadComplete = self.onPdfLoadComplete {
                            onPdfLoadComplete([:])
                        }
                        print("Failed to load PDF from URL: \(newURL.absoluteString)")
                    }
                }
            }
        } else {
            print("Invalid URL string: \(urlString)")
        }
    }
}
