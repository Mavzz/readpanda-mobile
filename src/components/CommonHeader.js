import React from 'react';
import { View, StyleSheet, Button, SafeAreaView, Platform } from 'react-native';
import SearchBar from './SearchBar';
import { storage } from "../utils/storage";
import log from "../utils/logger";
import { CommonActions  } from "@react-navigation/native";
import Icon from 'react-native-vector-icons/Ionicons';

const handleSignOut = async (navigation) => {
    log.info("Signing out...");
    // Clear the token from storage
    const userStorage = storage("user_storage");
    userStorage.clearAll();

    // Navigate to the login screen
    navigation.dispatch(
        CommonActions.reset({
            index: 0,
            routes: [{ name: "Login" }],
        }));
}

const CommonHeader = ({ showSearch, navigation, username }) => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerContainer}>
                {/* Profile Icon */}
                <View style={styles.iconContainer}>
                    <Icon 
                        name="person-circle-outline" 
                        size={32} 
                        color="#666"
                        onPress={() => navigation.navigate('Profile', { username: username })}
                    />
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    {showSearch && <SearchBar />}
                </View>

                {/* Notification Icon */}
                <View style={styles.iconContainer}>
                    <Icon 
                        name="notifications-outline" 
                        size={28} 
                        color="#666"
                        onPress={() => {/* Handle notification press */}}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#fff',
        width: '100%',
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        paddingHorizontal: 10,
        height: 60,
        paddingTop: Platform.OS === 'android' ? 25 : 0,
        marginTop: Platform.OS === 'android' ? 0 : 0,

    },
    iconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flex: 1,
        marginHorizontal: 12,
    }
});

export default CommonHeader;