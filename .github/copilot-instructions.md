# ReadPanda Mobile - AI Coding Assistant Instructions

## Project Overview
ReadPanda is a React Native social reading app where users can read books together, add comments to specific sections, and join reading rooms for collaborative discussions. Think Discord for book reading.

## Architecture Patterns

### Authentication & Navigation Flow
- **Authentication Context**: `src/contexts/AuthContext.js` manages global auth state using React Context
- **Conditional Navigation**: App shows `AuthStackNavigator` (Login/SignUp) or `MainTabNavigator` based on `isAuthenticated` in `src/navigation/AppNavigator.js`
- **Deep Linking**: Configured with `readpanda://` scheme for OAuth redirects and book sharing
- **Toast Integration**: `<Toaster />` component must be rendered at root level in AppNavigator for global toast functionality

### Storage Strategy (Hybrid Approach)
- **MMKV**: Fast storage for auth tokens, user preferences, cache via `src/utils/enhanceedStorage.js`
- **SQLite**: Persistent storage for manuscripts, reading progress, rooms
- **Storage Categories**: Defined in `src/constants/storageConstants.js` - always use these constants
- **Enhanced Storage**: Use `enhanceedStorage` wrapper instead of direct storage calls

### API Communication
- **Dynamic Backend URL**: Uses local IP detection in `src/utils/Helper.js` with `getBackendUrl()` function
- **Custom Hooks**: `getRequest`, `postRequest`, `putRequest` in `src/services/` return `{status, response}` objects
- **Auth Headers**: Always use `Bearer ${token}` format from `enhanceedStorage.getAuthToken()`

### Component Patterns
- **CommonHeader**: Shared header with profile/notifications/search - shows on all main tabs
- **Service Components**: Components like Toaster, NotificationService follow singleton pattern
- **Stack + Tab Navigation**: HomeStack inside MainTabs for book reading flow (Home → ManuscriptScreen)

## Key Development Workflows

### Running the App
```bash
npm run start          # Start Metro bundler
npm run android       # Run on Android
npm run ios          # Run on iOS
npm run pods         # iOS pod install
npm run reset:all    # Clean everything and reinstall
```

### Adding New Screens
1. Create screen in `src/screens/`
2. Add to appropriate navigator in `src/navigation/`
3. Update deep linking config if needed in `AppNavigator.js`
4. Use `useAuth()` hook for authentication checks

### Storage Operations
```javascript
// Always use enhancedStorage wrapper
import enhanceedStorage from '../utils/enhanceedStorage';

// Auth data
const token = enhanceedStorage.getAuthToken();
enhanceedStorage.storeAuthData(authData);

// Use STORAGE_CATEGORIES constants
import { STORAGE_CATEGORIES } from '../constants/storageConstants';
```

### Toast Messages
```javascript
import { showToast } from '../components/Toaster';

// Always specify type: 'success', 'error', 'info'
showToast('Welcome back!', 'success', 4000);
```

## Critical Integration Points

### Firebase Setup
- **Messaging**: `@react-native-firebase/messaging` for push notifications
- **Permission Flow**: `checkNotificationPermission()` in Helper.js handles setup
- **Message Handling**: Integrated with local notification storage system

### OAuth Flow
- **Google Auth**: Uses `react-native-app-auth` with deep linking
- **Redirect Handling**: `oauth/google` route in linking config processes auth results
- **Token Storage**: Automatically stores in MMKV via AuthContext.signIn()

### PDF Reading
- **React Native PDF**: Custom `PdfViewer` component in `src/components/`
- **Native Bridge**: iOS uses Swift bridge `RNPdfViewer.swift` for enhanced functionality
- **Reading Progress**: Hybrid storage (MMKV for current position, SQLite for history)

## Project-Specific Conventions

### File Organization
- **Screens**: Named with `Screen` suffix (e.g., `HomeScreen.js`)
- **Services**: Use hooks pattern (`getRequest.js`) or singleton (`storageService.js`)
- **Utils**: Pure functions, no React dependencies
- **Components**: Reusable UI only, business logic in screens/contexts

### Error Handling
- **Logging**: Use `log` from `src/utils/logger.js` instead of console.log
- **API Errors**: Always handle both network and response errors in custom hooks
- **Storage Errors**: Enhanced storage methods include try/catch with logging

### Environment Variables
```javascript
// Always use @env imports
import { SECRET_KEY, API_VERSION } from "@env";

// Dynamic IP detection for local development
const backendUrl = await getBackendUrl("/books/all");
```

### Animation Standards
- **Reanimated v3**: Use `react-native-reanimated` for complex animations
- **Spring Animations**: Preferred for UI interactions (buttons, cards)
- **Worklet Functions**: Mark animation functions with 'worklet' directive

## Common Patterns to Follow

### Screen Structure
```javascript
const MyScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Use custom hooks for API calls
  const fetchData = async () => {
    const token = enhanceedStorage.getAuthToken();
    const { status, response } = await getRequest(url, { Authorization: `Bearer ${token}` });
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Always wrap main content in SafeAreaView */}
    </SafeAreaView>
  );
};
```

### Navigation Patterns
```javascript
// Tab navigation with nested stacks
navigation.navigate('ManuscriptScreen', { book }); // From HomeStack
navigation.navigate('Profile'); // From MainStack
```

This codebase emphasizes social reading features, hybrid storage architecture, and smooth user experience with animations and real-time notifications.