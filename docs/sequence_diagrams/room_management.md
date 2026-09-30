---
config:
  theme: redux-dark-color
---
sequenceDiagram
    autonumber
    box rgba(60,60,60,0.1) React Native App
      participant User
      participant MyRoomsScreen as "My Rooms Screen"
      participant JoinRoomScreen as "Join Room Screen"
      participant CurrentReadScreen as "Current Read Screen"
      participant NotificationService as "Push Notifications"
    end
    box rgba(82,53,88,0.12) Backend Services
      participant RoomAPI as "Room API"
      participant WebSocket as "WebSocket Server"
      participant NotificationAPI as "Push Service"
    end
    
    User->>MyRoomsScreen: View my rooms
    MyRoomsScreen->>RoomAPI: Fetch user rooms
    RoomAPI-->>MyRoomsScreen: Return room list
    User->>JoinRoomScreen: Enter room code
    JoinRoomScreen->>RoomAPI: Join room request
    RoomAPI->>WebSocket: Add user to room
    WebSocket->>NotificationAPI: Notify room members
    NotificationAPI->>NotificationService: Push to other users
    RoomAPI-->>JoinRoomScreen: Room joined successfully
    User->>CurrentReadScreen: Start reading session
    CurrentReadScreen->>WebSocket: Connect to room
    WebSocket-->>CurrentReadScreen: Real-time updates
    CurrentReadScreen->>WebSocket: Send reading progress
    WebSocket->>NotificationAPI: Broadcast progress
    NotificationAPI->>NotificationService: Update other members