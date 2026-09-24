# Technical Documentation: ReadPanda Mobile

## 1. Introduction

This document provides a comprehensive technical overview of the ReadPanda mobile application. ReadPanda is a mobile app built with React Native, designed to help users track their reading, discover new books, and engage with a community of readers.

## 2. Getting Started

### Prerequisites

- Node.js (LTS version)
- npm or yarn
- Git

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd readpanda-mobile
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Environment Configuration

The application requires a backend API to function. The API endpoint is configured via an environment file.

1.  Create a `.env` file in the root of the project.
2.  Add the following variable, pointing to your backend server:
    ```
    API_URL=http://your-api-url.com/api
    ```

### Running the Application

For detailed instructions on how to run the application, please see the `RUN.md` file.

## 3. Project Structure

The project follows a standard React Native structure. Key directories are located within the `src/` folder.

```
readpanda-mobile/
├── src/
│   ├── assets/         # Static assets like images and fonts
│   ├── components/     # Reusable UI components (Button, Card, etc.)
│   ├── navigation/     # Navigation logic and route definitions
│   ├── screens/        # Application screens (HomeScreen, ProfileScreen, etc.)
│   ├── services/       # API communication and data fetching hooks
│   ├── styles/         # Global styles
│   └── utils/          # Utility functions and helpers (e.g., AsyncStorage wrapper)
├── App.js              # Main application entry point
└── package.json        # Project dependencies and scripts
```

## 4. Architecture

### Framework and UI

-   **React Native **: The application is built using React Native, allowing for a streamlined development and build process.
-   **UI Components**: The UI is constructed from core React Native components and a set of custom, reusable components found in `src/components`.

### Navigation

-   **React Navigation**: The app uses `react-navigation` for all routing and navigation.
-   **Navigators**:
    -   `createStackNavigator`: Used for stack-based navigation (e.g., moving from a list to a detail screen).
    -   `createBottomTabNavigator`: Used for the main tab-based navigation after a user logs in.
-   **Navigation Flow**:
    1.  **Authentication Stack (`AuthStack`)**: Handles the initial user flow.
        -   `LoginScreen`
        -   `SignUpScreen`
    2.  **Main Application Tabs (`MainTabs`)**: The core of the app, accessible after authentication.
        -   `HomeScreen`: The main dashboard.
        -   `CurrentReadScreen`: Shows the user's current book.
        -   `MyRoomsScreen`: Displays reading groups or rooms.
        -   `ProfileScreen`: User profile and settings.
    3.  **Global Stack**: A top-level stack navigator determines whether to show the `AuthStack` or the `MainTabs` based on the user's authentication status. It also contains other screens that can be accessed from various points in the app, such as `InterestScreen`, `JoinRoomScreen`, and `ManuscriptScreen`.

### State Management

-   **Component State**: Local UI state is managed using React Hooks (`useState`, `useEffect`).
-   **Global State (Authentication)**: User authentication state (e.g., the user token) is managed via a context-based approach (`AuthContext`), which is a common pattern used with React Navigation to handle auth flows. The token is persisted in `AsyncStorage`.

### Data Fetching

-   **Custom Hooks**: The app uses custom hooks (`getRequest`, `postRequest`) to abstract data fetching logic. These hooks encapsulate loading, data, and error states, providing a consistent and reusable way to interact with the API across different components.

## 5. API Interaction

-   **Axios**: HTTP requests to the backend are made using the `axios` library.
-   **Centralized API Configuration**: A pre-configured `axios` instance is defined in `src/services/api.js`. This instance sets the `baseURL` from the `.env` file.
-   **Authentication**: The `axios` instance uses an interceptor to automatically attach the user's authentication token (retrieved from `AsyncStorage`) to the `Authorization` header of every outgoing request. This simplifies API calls from components, as they don't need to manage tokens manually.

## 6. Key Dependencies

-   `react-navigation`: For routing and navigation.
-   `axios`: For making HTTP requests to the backend.
-   `@react-native-async-storage/async-storage`: For persisting data locally (e.g., user tokens).
-   `react-native-dotenv`: For managing environment variables.

## 7. Screens (`src/screens`)

-   **LoginScreen / SignUpScreen**: User authentication.
-   **HomeScreen**: Main landing screen after login.
-   **CurrentReadScreen**: Details about the book the user is currently reading.
-   **FavoritesScreen**: A list of the user's favorite books.
-   **InterestScreen**: A screen for users to select their reading interests.
-   **JoinRoomScreen**: Allows users to join a reading room.
-   **ManuscriptScreen**: For viewing or reading a manuscript.
-   **MyRoomsScreen**: Lists the reading rooms the user is a part of.
-   **ProfileScreen**: User profile and settings.

## 8. Reusable Components (`src/components`)

-   **Background.js**: A component for providing a consistent background style.
-   **Button.js**: A standardized, reusable button.
-   **Card.js**: A versatile card component for displaying content.
-   **SearchBar.js**: A search input component.

## 9. Styling

-   **Global Styles**: A global stylesheet is defined in `src/styles/global.js` to ensure a consistent look and feel across the application. Components primarily use this stylesheet for their styling needs.

## 10. Logging

The application uses `react-native-logs` for logging. This provides a more robust and configurable logging solution than `console.log`.

### Configuration

The logger is configured in `src/utils/logger.js`. This file sets up the default log level, transport (to the console), and formatting.

### Usage

To use the logger in any component or file, import it from the `logger.js` utility:

```javascript
import log from "../utils/logger";
```

Then, you can use the following methods to log messages at different levels:

-   `log.debug("This is a debug message")`: For detailed, verbose information useful for debugging.
-   `log.info("This is an info message")`: For general, informational messages about the application's state.
-   `log.warn("This is a warning message")`: For potential issues that don't cause the application to fail.
-   `log.error("This is an error message")`: For errors and exceptions.

All logs are displayed in the Metro bundler console during development.
