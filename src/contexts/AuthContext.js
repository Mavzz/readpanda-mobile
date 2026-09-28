import { createContext, useContext, useEffect } from 'react';
import useAuthStore from '../stores/authStore';
import apiService from '../services/apiService';

const AuthContext = createContext();

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

  const authStore = useAuthStore();

  return (
    <AuthContext.Provider value={authStore}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
