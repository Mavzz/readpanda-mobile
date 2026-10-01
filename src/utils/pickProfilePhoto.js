import { Alert } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import log from './logger';

const OPTIONS = { mediaType: 'photo', quality: 0.8, maxWidth: 800, maxHeight: 800 };

// Camera or library, as one promise: resolves with the picked photo's local
// uri, or null when the reader backs out. The 7c camera badge uses it; the
// uri is kept on the device only until profile photos are uploaded.
const pickProfilePhoto = () => new Promise((resolve) => {
  const handle = (response) => {
    if (response.didCancel || response.errorMessage) {
      if (response.errorMessage) {
        log.warn('Profile photo pick failed:', response.errorMessage);
      }
      resolve(null);
      return;
    }
    resolve(response.assets?.[0]?.uri || null);
  };

  Alert.alert('Add a profile photo', null, [
    { text: 'Take photo', onPress: () => launchCamera(OPTIONS, handle) },
    { text: 'Choose from library', onPress: () => launchImageLibrary(OPTIONS, handle) },
    { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
  ]);
});

export default pickProfilePhoto;
