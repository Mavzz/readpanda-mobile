# Running the Application

This project is a bare React Native application. You will need to have a native development environment set up to run the app.

### Prerequisites

-   Node.js (LTS version)
-   npm or yarn
-   React Native CLI
-   Android Studio (for Android development)
-   Xcode (for iOS development)

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

3.  **Install pods (for iOS):**
    ```bash
    cd ios && pod install
    ```

### Environment Configuration

The application requires a backend API to function. The API endpoint is configured via an environment file.

1.  Create a `.env` file in the root of the project.
2.  Add the following variable, pointing to your backend server:
    ```
    API_URL=http://your-api-url.com/api
    ```

### Running the Application

-   **Start the Metro bundler:**
    ```bash
    npm start
    ```
    This command starts the Metro bundler, which is a JavaScript bundler for React Native.

-   **Run on Android:**
    1.  Make sure you have an Android emulator running or a device connected.
    2.  In a separate terminal, run the following command:
        ```bash
        npm run android
        ```

-   **Run on iOS:**
    1.  Make sure you have an iOS simulator running or a device connected.
    2.  In a separate terminal, run the following command:
        ```bash
        npm run ios
        ```