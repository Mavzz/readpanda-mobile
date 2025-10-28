---
config:
  theme: redux-dark-color
---
sequenceDiagram
    autonumber
    box rgba(60,60,60,0.1) React Native App
      participant User
      participant SignUpScreen as "Sign Up Screen"
      participant InterestScreen as "Interest Selection"
      participant AuthContext as "Auth Context"
      participant Storage as "Secure Storage"
      participant NotificationService as "Notification Service"
    end
    box rgba(82,53,88,0.12) Backend API
      participant AuthAPI as "Auth API"
      participant UserAPI as "User Preferences API"
      participant EmailService as "Email Verification"
    end
    
    User->>SignUpScreen: Enter registration details
    SignUpScreen->>AuthAPI: Create account request
    AuthAPI->>EmailService: Send verification email
    AuthAPI-->>SignUpScreen: Account created (unverified)
    User->>SignUpScreen: Click email verification link
    SignUpScreen->>AuthAPI: Verify email token
    AuthAPI-->>SignUpScreen: Email verified
    SignUpScreen->>InterestScreen: Navigate to interests
    User->>InterestScreen: Select reading preferences
    InterestScreen->>UserAPI: Save user preferences
    UserAPI-->>InterestScreen: Preferences saved
    InterestScreen->>AuthContext: Complete onboarding
    AuthContext->>Storage: Store onboarding status
    AuthContext->>NotificationService: Request permissions
    NotificationService-->>AuthContext: Permission granted/denied
    AuthContext-->>User: Navigate to main app