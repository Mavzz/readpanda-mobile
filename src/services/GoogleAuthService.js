import { authorize, refresh, revoke } from 'react-native-app-auth';
import log from '../utils/logger';

const googleAuthConfig = {
  issuer: 'https://accounts.google.com',
  clientId: '439290157125-49ieeb2p2hcrbv0vdaq4qfqchg9i9v8i.apps.googleusercontent.com', // Replace with your actual client ID
  redirectUrl: 'com.googleusercontent.apps.439290157125-49ieeb2p2hcrbv0vdaq4qfqchg9i9v8i:/oauth2redirect/google', // Replace with your actual redirect URL
  scopes: ['openid', 'profile', 'email'],
};

export class GoogleAuthService {
  static async signInWithGoogle() {
    try {
      const result = await authorize(googleAuthConfig);
      return {
        success: true,
        user: {
          idToken: result.idToken,
        },
      };
    } catch (error) {
      log.error('Google Sign-In Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async refreshGoogleToken(refreshToken) {
    try {
      const result = await refresh(googleAuthConfig, { refreshToken });
      return {
        success: true,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };
    } catch (error) {
      log.error('Token Refresh Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async signOut(refreshToken) {
    try {
      await revoke(googleAuthConfig, {
        tokenToRevoke: refreshToken,
        sendClientId: true,
      });
      return { success: true };
    } catch (error) {
      log.error('Sign Out Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}