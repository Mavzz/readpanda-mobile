---
config:
  theme: redux-dark-color
---
sequenceDiagram
    autonumber
    box rgba(60,60,60,0.1) React Native App
      participant User
      participant HomeScreen as "Home Screen"
      participant PdfViewer as "PDF Viewer"
      participant Storage as "Local Storage"
      participant CacheManager as "Cache Manager"
    end
    box rgba(82,53,88,0.12) Backend Services
      participant ContentAPI as "Content API"
      participant CDN as "Content Delivery Network"
      participant ProcessingAPI as "PDF Processing Service"
    end
    
    User->>HomeScreen: Select manuscript
    HomeScreen->>ContentAPI: Request manuscript details
    ContentAPI-->>HomeScreen: Return metadata + CDN URL
    HomeScreen->>CacheManager: Check if cached locally
    alt PDF Not Cached
        CacheManager->>CDN: Download PDF file
        CDN-->>CacheManager: Stream PDF content
        CacheManager->>Storage: Store locally
        CacheManager->>ProcessingAPI: Extract text/metadata
        ProcessingAPI-->>CacheManager: Return processed data
    else PDF Cached
        CacheManager->>Storage: Load from cache
    end
    CacheManager-->>PdfViewer: Load PDF
    User->>PdfViewer: Read offline
    PdfViewer->>Storage: Save reading progress
    PdfViewer->>ContentAPI: Sync progress (when online)