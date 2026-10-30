import { useEffect } from 'react';
import { AppState } from 'react-native';
import useAuthStore from '../stores/authStore';
import apiService from '../services/apiService';

// Auth state lives in useAuthStore — read it with a selector, e.g.
// useAuthStore((s) => s.user), so a component only re-renders when the
// fields it uses change. This provider just wires up the startup side effects.
export const AuthProvider = ({ children }) => {
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    loadUser().then(() => useAuthStore.getState().syncAccount());
  }, [loadUser]);

  // The account can change on another device (a new username, say): catch
  // up whenever the app comes back, as well as at launch.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        useAuthStore.getState().syncAccount();
      }
    });
    return () => subscription.remove();
  }, []);

  // When a refresh token is rejected, apiService clears the stored tokens —
  // but only the store decides which navigator is mounted. Without this the
  // reader stays on Main with every request failing until a restart.
  useEffect(() => {
    apiService.setAuthFailureCallback(() => useAuthStore.getState().signOut());
    return () => apiService.setAuthFailureCallback(null);
  }, []);

  return children;
};
