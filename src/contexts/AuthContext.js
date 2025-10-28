import { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import log from '../utils/logger';
import enhanceedStorage from '../utils/enhanceedStorage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [refreshToken, setRefreshToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {

            try {
                const authData = enhanceedStorage.getAuthData();

                if (authData && authData.token && authData.userProfile) {
                    setUser(authData.userProfile);
                    setToken(authData.token);
                    setRefreshToken(authData.refreshToken);
                    log.info('User data loaded from storage', { username: authData.userProfile.username });
                } else {
                    log.info('No user data found in storage');
                }
            } catch (e) {
                log.error('Failed to load token from storage', e);
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    const authContext = {
        user, token, refreshToken,
        isLoading,
        isAuthenticated: !!token,

        signIn: async (userData) => {
            try {
                setUser(userData.userDetails);
                setToken(userData.token);
                setRefreshToken(userData.refreshToken);
                enhanceedStorage.storeAuthData(userData);
            } catch (e) {
                log.error('Failed to save user data', e);
            }
        },

        signOut: async () => {
            try {
                setUser(null);
                setToken(null);
                setRefreshToken(null);
                enhanceedStorage.clearAuthData();
                log.info('User signed out');
            } catch (e) {
                log.error('Failed to clear user data', e);
            }
        },

        updateUser: async (updates) => {
            if (!user) return;

            const updatedUser = { ...user, ...updates };
            try {
                enhanceedStorage.updateUserProfile(updates);
                setUser(updatedUser);
                log.info('User data updated', { username: updatedUser.username });
            } catch (e) {
                log.error('Failed to update user data', e);
            }
        }
    };

    return (
        <AuthContext.Provider value={authContext}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};