//
//  RNPdfViewer.swift
//  ReadPanda
//
//  Created by Venkataramaaditya Nimmagadda on 18/08/25.
//

import UIKit
import PDFKit

@objc(RNPdfViewer)
class RNPdfViewer: UIView {

  private var pdfView: PDFView!
  private var url: URL?

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

  // This method will be called from React Native to set the PDF URLß
  @objc func setPdfUrl(_ urlString: String) {
      guard let newURL = URL(string: urlString) else {
          print("Invalid URL string: \(urlString)")
          return
      }
      
      self.url = newURL
      

      DispatchQueue.global(qos: .userInitiated).async {
          let success = PDFDocument(url: newURL) != nil
          
          DispatchQueue.main.async {
              if success, let document = PDFDocument(url: newURL) {
                  self.pdfView.document = document
                  print("PDF loaded from URL: \(newURL.absoluteString)")
              } else {
                  print("Failed to load PDF from URL: \(newURL.absoluteString)")
              }
          }
      }
  }
}
