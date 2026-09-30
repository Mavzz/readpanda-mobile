---
config:
  theme: redux-dark-color
---
sequenceDiagram
    autonumber
    box rgba(60,60,60,0.1) React Native App
      participant User
      participant LoginScreen as "Login Screen"
      participant Storage as "Secure Storage"
      participant APIService as "API Service Layer"
      participant Interceptor as "HTTP Interceptor"
      participant AppScreens as "Protected App Screens"
      participant LogoutHandler as "Logout Handler"
    end
    box rgba(82,53,88,0.12) Backend API
      participant AuthCtrl as "Auth Controller"
      participant JWT as "JWT Middleware"
      participant TokenDB as "Refresh Token Store"
      participant Protected as "Protected API Routes"
      participant RevokeFlow as "Revoked Token Handler"
      participant RotateFlow as "Token Rotation Option"
    end
    User->>LoginScreen: Enters Credentials
    LoginScreen->>AuthCtrl: Send credentials
    AuthCtrl->>TokenDB: Store tokens (access + refresh)
    AuthCtrl-->>LoginScreen: Return tokens
    LoginScreen->>Storage: Store tokens
    AppScreens->>APIService: User Action
    APIService->>Interceptor: Attach access token
    Interceptor->>JWT: Call API with token
    JWT->>Protected: Verify access token
    Protected-->>AppScreens: Return response
    JWT-->>Interceptor: Expired/Invalid token
    alt Token Expired/Invalid
        Interceptor->>AuthCtrl: Use refresh token
        AuthCtrl->>TokenDB: Validate refresh token
        alt Valid Refresh Token
            AuthCtrl-->>Interceptor: Issue new access/refresh tokens
            Interceptor->>Storage: Store new tokens
            Interceptor->>JWT: Retry original API call
        else Invalid Refresh Token
            AuthCtrl->>RevokeFlow: Handle revoked/expired
            RevokeFlow->>LogoutHandler: Force logout
            LogoutHandler->>Storage: Clear tokens
            LogoutHandler->>TokenDB: Invalidate on server
            LogoutHandler-->>LoginScreen: Redirect to login
        end
    end
    AppScreens->>LogoutHandler: User logs out
    LogoutHandler->>Storage: Clear tokens
    LogoutHandler->>TokenDB: Invalidate refresh token
    LogoutHandler-->>LoginScreen: Redirect to login
    AuthCtrl->>RotateFlow: Optional: Rotate token
    RotateFlow->>TokenDB: Update rotated token
    Interceptor-->>AppScreens: Network error (offline/timeout)
    note right of AppScreens: Prompt retry / Show offline
    Storage-->>LoginScreen: Device wipe/reinstall (no tokens, force re-login)
    LoginScreen->>AuthCtrl: Login from another device
    AuthCtrl->>TokenDB: Invalidate previous refresh tokens
    note over Storage: Tokens encrypted at rest
    note over TokenDB: Encrypted token storage