import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { loginStyles } from '../styles/global';
import Background from '../components/Background';
import log from '../utils/logger';

const Favorite = () => {
  const route = useRoute();
  const { username } = route.params;
  log.info(`Favorites screen loaded for user: ${username}`);

  return (
    <Background>
      <View style={loginStyles.container}>
        <Text style={styles.welcome}>
          Welcome to the Favorites Screen, {username}!
        </Text>
      </View>
    </Background>
  );
};

const styles = StyleSheet.create({
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default Favorite;
