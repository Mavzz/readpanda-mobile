import UIKit
import PDFKit

@objc(RNPdfViewer)
class RNPdfViewer: UIView {
  
  private var pdfView: PDFView!
  private let cacheFolderName = "PDFCache"
  private var activityIndicator: UIActivityIndicatorView!
  private var currentDocumentURL: URL?
  private var fileManager = FileManager.default
  private var cacheDirectory: URL? {
    return fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first?
    .appendingPathComponent(cacheFolderName)
  }
  
  override init(frame: CGRect) {
    super.init(frame: frame)
    setupPdfView()
    setupActivityIndicator()
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
    
    // Optimize PDF rendering
    pdfView.autoScales = true
    pdfView.displayMode = .singlePageContinuous
    pdfView.displaysPageBreaks = true
    pdfView.displayDirection = .vertical
    
    // Optimize performance
    pdfView.enableDataDetectors = false // Disable data detectors for better performance
    pdfView.backgroundColor = .clear // Reduce compositing
  }
  
  private func setupActivityIndicator() {
    activityIndicator = UIActivityIndicatorView(style: .large) // Or .medium based on preference
    activityIndicator.translatesAutoresizingMaskIntoConstraints = false
    activityIndicator.hidesWhenStopped = true // Hide when not animating
    self.addSubview(activityIndicator)
    
    NSLayoutConstraint.activate([
      activityIndicator.centerXAnchor.constraint(equalTo: self.centerXAnchor),
      activityIndicator.centerYAnchor.constraint(equalTo: self.centerYAnchor)
    ])
    activityIndicator.stopAnimating() // Start hidden
  }
  
  @objc func setPdfUrl(_ urlString: String, title: String) {
    guard let newURL = URL(string: urlString) else {
      print("Invalid URL string: \(urlString)")
      return
    }
    
    currentDocumentURL = newURL
    
    DispatchQueue.main.async {
      self.activityIndicator.startAnimating()
    }
    // Create cached file URL
    guard let cacheDir = cacheDirectory else {
      print("Could not access cache directory")
      return
    }

    // Ensure cache directory exists
    do {
        try fileManager.createDirectory(at: cacheDir, withIntermediateDirectories: true, attributes: nil)
    } catch {
        print("Failed to create cache directory: \(error)")
        return
    }

    let cachedFileURL = cacheDir.appendingPathComponent("\(title).pdf")

    // Check if file exists in cache
    if fileManager.fileExists(atPath: cachedFileURL.path),
       let cachedDocument = PDFDocument(url: cachedFileURL) {
        DispatchQueue.main.async {
            self.pdfView.document = cachedDocument
            self.activityIndicator.stopAnimating()
            print("PDF loaded from cache: \(cachedFileURL.path)")
        }
        return
    }

    // Download and cache if not found
    DispatchQueue.global(qos: .userInitiated).async {
        do {
            let data = try Data(contentsOf: newURL)
            guard let document = PDFDocument(data: data) else {
                print("Failed to create PDF document from data")
                return
            }
            
            // Save to cache with proper error handling
            try data.write(to: cachedFileURL, options: .atomic)
            
            DispatchQueue.main.async {
                // Only set document if this is still the current URL
                if self.currentDocumentURL == newURL {
                    self.pdfView.document = document
                    self.activityIndicator.stopAnimating()
                    print("PDF downloaded and cached: \(cachedFileURL.path)")
                }
            }
        } catch {
            DispatchQueue.main.async {
                self.activityIndicator.stopAnimating()
                print("Error handling PDF: \(error)")
            }
        }
    }
  }
}
