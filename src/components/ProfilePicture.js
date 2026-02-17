import React, { useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Alert, Platform, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import enhanceedStorage from '../utils/enhanceedStorage';
import { MyTheme } from '../styles/global';
import log from '../utils/logger';

// Fallback for when react-native-image-picker is not available
let launchImageLibrary = null;
let launchCamera = null;

try {
  const imagePicker = require('react-native-image-picker');
  launchImageLibrary = imagePicker.launchImageLibrary;
  launchCamera = imagePicker.launchCamera;
} catch (error) {
  log.warn('react-native-image-picker not available, using fallback mode');
}

const ProfilePicture = ({
  size = 80,
  editable = false,
  onImageChange,
  style,
  user,
}) => {
  const [imageUri, setImageUri] = useState(user?.profilePicture || null);
  const [isLoading, setIsLoading] = useState(false);

  // Using icon-based default profile instead of image asset

  const handleImageSelect = () => {
    if (!editable) return;

    if (!launchImageLibrary || !launchCamera) {
      Alert.alert(
        'Profile Picture',
        'Image picker is not available. Please install react-native-image-picker to enable profile picture changes.',
        [{ text: 'OK' }],
      );
      return;
    }

    Alert.alert(
      'Change Profile Picture',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Photo Library', onPress: () => openImageLibrary() },
        { text: 'Remove Photo', onPress: () => removeImage(), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const openCamera = () => {
    if (!launchCamera) return;

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    };

    launchCamera(options, handleImageResponse);
  };

  const openImageLibrary = () => {
    if (!launchImageLibrary) return;

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    };

    launchImageLibrary(options, handleImageResponse);
  };

  const handleImageResponse = (response) => {
    if (response.didCancel || response.errorMessage) {
      log.info('Image selection cancelled or failed:', response.errorMessage);
      return;
    }

    if (response.assets && response.assets[0]) {
      const asset = response.assets[0];
      const newImageUri = asset.uri;

      setImageUri(newImageUri);
      saveProfilePicture(newImageUri);

      if (onImageChange) {
        onImageChange(newImageUri);
      }
    }
  };

  const removeImage = () => {
    setImageUri(null);
    saveProfilePicture(null);

    if (onImageChange) {
      onImageChange(null);
    }
  };

  const saveProfilePicture = async (uri) => {
    try {
      setIsLoading(true);

      // Update user profile in storage
      const currentUser = enhanceedStorage.getUserProfile();
      if (currentUser) {
        const updatedUser = { ...currentUser, profilePicture: uri };
        enhanceedStorage.updateUserProfile({ profilePicture: uri });
        log.info('Profile picture updated in storage');
      }

      // TODO: Upload to server if needed
      // await uploadProfilePicture(uri);

    } catch (error) {
      log.error('Failed to save profile picture:', error);
      Alert.alert('Error', 'Failed to save profile picture. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderProfileImage = () => {
    if (imageUri) {
      return (
        <Image
          source={{ uri: imageUri }}
          style={[styles.profileImage, { width: size, height: size }]}
          onError={() => {
            log.warn('Failed to load profile image, using default');
            setImageUri(null);
          }}
        />
      );
    }

    // Generate initials from username
    const getInitials = (name) => {
      if (!name) return '?';
      const names = name.trim().split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    };

    const initials = getInitials(user?.username || user?.name);
    log.info('Displaying initials for profile picture:', initials);
    const showInitials = initials && initials !== '?';
    log.info('Show initials:', showInitials);

    return (
      <View style={[
        styles.defaultProfileContainer,
        {
          width: size,
          height: size,
          borderRadius: size,
          //backgroundColor: MyTheme.colors.primary + '20' // 20% opacity
        },
      ]}>
        {showInitials ? (
          <Text style={[
            styles.initialsText,
            {
              fontSize: size * 0.35,
              color: MyTheme.colors.primary,
            },
          ]}>
            {initials}
          </Text>
        ) : (
          <Icon
            name="person"
            size={size * 0.5}
            color={MyTheme.colors.primary}
          />
        )}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handleImageSelect}
      disabled={!editable || isLoading}
      activeOpacity={editable ? 0.8 : 1}
    >
      <View style={styles.imageContainer}>
        {renderProfileImage()}

        {editable && (
          <View style={[styles.editIndicator, {
            width: size * 0.25,
            height: size * 0.25,
            borderRadius: (size * 0.25) / 2,
            right: -2,
            bottom: -2,
          }]}>
            <Icon
              name="camera"
              size={size * 0.15}
              color="#fff"
            />
          </View>
        )}

        {isLoading && (
          <View style={[styles.loadingOverlay, {
            width: size,
            height: size,
            borderRadius: size / 2,
          }]}>
            <Icon
              name="hourglass-outline"
              size={size * 0.3}
              color="#fff"
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    borderRadius: 40, // Will be overridden by dynamic sizing
    borderWidth: 3,
    borderColor: MyTheme.colors.card,
  },
  defaultProfileContainer: {
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: MyTheme.colors.card,
  },
  initialsText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  editIndicator: {
    position: 'absolute',
    backgroundColor: MyTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  loadingOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
  },
});

export default ProfilePicture;