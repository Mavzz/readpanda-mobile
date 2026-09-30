---
config:
  theme: redux-dark-color
---
sequenceDiagram
    autonumber
    box rgba(60,60,60,0.1) React Native App
      participant User
      participant App as "App Component"
      participant ErrorBoundary as "Error Boundary"
      participant Logger as "Logger Service"
      participant Storage as "Local Storage"
    end
    box rgba(82,53,88,0.12) External Services
      participant CrashReporting as "Crash Analytics"
      participant API as "Backend API"
    end
    
    App->>ErrorBoundary: Component error occurs
    ErrorBoundary->>Logger: Log error details
    Logger->>Storage: Store error locally
    Logger->>CrashReporting: Send crash report
    ErrorBoundary-->>User: Show error fallback UI
    User->>App: Retry action
    App->>API: Network request fails
    API-->>App: Return error response
    App->>Logger: Log API error
    App->>Storage: Cache failed request
    App-->>User: Show retry option
    User->>App: Retry when online
    App->>Storage: Load cached request
    App->>API: Retry request