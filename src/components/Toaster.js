import React from 'react';
import { View, Text } from 'react-native';
import Toast from 'react-native-toast-message';

const toastConfig = {
    success: ({ text1, props }) => (
        <View style={{
            height: 60,
            width: '90%',
            backgroundColor: '#4BB543',
            borderRadius: 12,
            paddingHorizontal: 16,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#4BB543',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
            marginHorizontal: '5%',
        }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{text1}</Text>
        </View>
    ),
    error: ({ text1, props }) => (
        <View style={{
            height: 60,
            width: '90%',
            backgroundColor: '#FF3333',
            borderRadius: 12,
            paddingHorizontal: 16,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#FF3333',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
            marginHorizontal: '5%',
        }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{text1}</Text>
        </View>
    ),
    info: ({ text1, props }) => (
        <View style={{
            height: 60,
            width: '90%',
            backgroundColor: '#667eea',
            borderRadius: 12,
            paddingHorizontal: 16,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#667eea',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
            marginHorizontal: '5%',
        }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{text1}</Text>
        </View>
    )
};

const Toaster = () => {
    return <Toast config={toastConfig} />
}

export const showToast = (message, type = 'info', duration = 3000) => {
    Toast.show({
        type: type,
        text1: message,
        position: 'bottom',
        visibilityTime: duration,
        autoHide: true,
        bottomOffset: 100, // This will work now!
    });
}

export default Toaster;