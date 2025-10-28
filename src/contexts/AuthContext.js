import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import log from '../utils/logger';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {

            try {
                const userStorage = storage('user_storage');
                const userDataString = userStorage.getString('user');

                if (userDataString) {
                    const userData = JSON.parse(userDataString);
                    setUser(userData);
                    log.info('User data loaded from storage', { username: userData.username });
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
        user,
        isLoading,
        isAuthenticated: !!user?.token,

        signIn: (userData) => {
            const { token, username, isNewUser, email, preferences } = userData;
            const userObject = {
                token: token,
                username: username,
                email: email,
                isNewUser: isNewUser || false,
                preferences: preferences || {},
            };

            try {
                const userStorage = storage('user_storage');
                userStorage.set('user', JSON.stringify(userObject));
                setUser(userObject);
                log.info('User signed in', { username });
                log.info('User object:', userObject);
            } catch (e) {
                log.error('Failed to save user data', e);
            }
        },

        signOut: () => {
            try {
                const userStorage = storage('user_storage');
                userStorage.delete('user');
                setUser(null);
                log.info('User signed out');
            } catch (e) {
                log.error('Failed to clear user data', e);
            }
        },

        updateUser: (updates) => {
            if (!user) return;

            const updatedUser = { ...user, ...updates };
            try {
                const userStorage = storage('user_storage');
                userStorage.set('user', JSON.stringify(updatedUser));
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