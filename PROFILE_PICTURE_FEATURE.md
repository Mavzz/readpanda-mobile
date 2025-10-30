# Profile Picture Feature

## Overview
Added profile picture functionality to both the ProfileScreen and CommonHeader components.

## Components

### ProfilePicture Component (`src/components/ProfilePicture.js`)
- **Reusable component** for displaying user profile pictures
- **Fallback support** for when react-native-image-picker is not installed
- **User initials** displayed when no profile image is available
- **Editable mode** for changing profile pictures in ProfileScreen
- **Read-only mode** for display in CommonHeader

### Features
- **Image Selection**: Camera or Photo Library (when react-native-image-picker is available)
- **Initials Display**: Shows user initials when no profile image exists
- **Loading States**: Visual feedback during image operations
- **Error Handling**: Graceful fallbacks for missing dependencies
- **Responsive Sizing**: Configurable size prop
- **Animations**: Smooth press feedback

## Usage

### ProfileScreen
```javascript
<ProfilePicture
  size={100}
  editable={true}
  user={user}
  onImageChange={handleProfilePictureChange}
/>
```

### CommonHeader
```javascript
<ProfilePicture
  size={32}
  editable={false}
  user={user}
/>
```

## Installation Requirements

To enable full profile picture functionality, install:
```bash
npm install react-native-image-picker
```

For iOS, add camera/photo permissions to `Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>This app needs access to camera to take profile pictures.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs access to photo library to select profile pictures.</string>
```

For Android, add permissions to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
```

## Storage
- Profile pictures are stored in user profile via `enhanceedStorage.updateUserProfile()`
- Images are saved locally (can be extended to upload to server)
- Integrates with existing authentication context

## Fallback Mode
When react-native-image-picker is not available:
- Shows user initials or default icon
- Displays helpful message when edit is attempted
- Maintains visual consistency across the app