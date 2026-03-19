import { createContext, useContext, useEffect } from 'react';
import useAuthStore from '../stores/authStore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

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