---
config:
  theme: redux-dark-color
---
sequenceDiagram
    autonumber
    box rgba(60,60,60,0.1) React Native App
      participant User
      participant App as "App State"
      participant NotificationService as "Notification Service"
      participant NotificationList as "Notification List"
      participant Navigation as "Navigation Service"
    end
    box rgba(82,53,88,0.12) External Services
      participant FCM as "Firebase Cloud Messaging"
      participant NotificationAPI as "Notification API"
      participant Analytics as "Analytics Service"
    end
    
    App->>NotificationService: Initialize FCM token
    NotificationService->>FCM: Register device
    FCM-->>NotificationService: Return FCM token
    NotificationService->>NotificationAPI: Send token to backend
    NotificationAPI->>FCM: Send targeted notification
    FCM->>NotificationService: Receive push notification
    alt App in Foreground
        NotificationService->>NotificationList: Show in-app notification
        User->>NotificationList: Tap notification
        NotificationList->>Navigation: Navigate to content
    else App in Background
        NotificationService->>App: Show system notification
        User->>App: Tap notification (app opens)
        App->>Navigation: Deep link to content
    end
    Navigation->>Analytics: Track notification engagement