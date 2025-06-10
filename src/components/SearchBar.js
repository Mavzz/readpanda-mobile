import React from 'react';
import { TextInput, StyleSheet, View, Dimensions  } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const SearchBar = () => {
  return (
    <View style={styles.container}>
      <Icon name="search" size={20} color="#666" style={styles.icon} />
      <TextInput
        placeholder="Search books..."
        style={styles.input}
        placeholderTextColor="#666"
      />
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width * 0.5, // Set width to 50% of the screen width
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    height: 10,
    marginRight: 15, // Add some margin to the right
  },
  icon: {
    paddingLeft: 10,
  },
  input: {
    flex: 1,
    paddingLeft: 8,
    fontSize: 16,
    color: '#333',
  },
});

export default SearchBar;