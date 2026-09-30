import { useEffect } from 'react';
import useAuthStore from '../stores/authStore';
import apiService from '../services/apiService';

// Auth state lives in useAuthStore — read it with a selector, e.g.
// useAuthStore((s) => s.user), so a component only re-renders when the
// fields it uses change. This provider just wires up the startup side effects.
export const AuthProvider = ({ children }) => {
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // When a refresh token is rejected, apiService clears the stored tokens —
  // but only the store decides which navigator is mounted. Without this the
  // reader stays on Main with every request failing until a restart.
  useEffect(() => {
    apiService.setAuthFailureCallback(() => useAuthStore.getState().signOut());
    return () => apiService.setAuthFailureCallback(null);
  }, []);

  return children;
};
