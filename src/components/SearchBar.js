import React, { useState, useCallback } from 'react';
import { TextInput, StyleSheet, View, Dimensions, Keyboard, Pressable } from 'react-native';
import { iconButton as IconButton } from "../components/Button";
import log from "../utils/logger";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const SearchBar = () => {

  const [isFocused, setIsFocused] = useState(false);
  const [searchText, setSearchText] = useState("");

  // Animation values
  const containerWidth = useSharedValue('95%');
  const containerOpacity = useSharedValue(1);
  const inputScale = useSharedValue(1);

  const searchBooks = () => {
    log.info(`Searching for book: ${searchText}`);
    setSearchText("");
    Keyboard.dismiss();
    // Implement search functionality here
    // For example, you might want to call a function passed via props
    // props.onSearch(searchText);
    // Placeholder for actual search logic
    log.info("Search functionality is not yet implemented.");
    alert("Search functionality is not yet implemented.");

  }

  const clearSearch = () => {
    setSearchText("");
    // Implement clear functionality here
    log.info("Cleared search input.");
  }

  const handleFocus = () => {
    setIsFocused(true);
    containerWidth.value = withSpring('100%');
    inputScale.value = withSpring(1.02);
  };

  const handleBlur = () => {
    setIsFocused(false);
    containerWidth.value = withSpring('95%');
    inputScale.value = withSpring(1);
  };

  const handleOutsidePress = useCallback(() => {
    if (isFocused) {
      Keyboard.dismiss();
      setIsFocused(false);
    }
  }, [isFocused]);

  // Animated styles
  const animatedContainerStyle = useAnimatedStyle(() => ({
    width: containerWidth.value,
    transform: [{ scale: inputScale.value }],
    opacity: containerOpacity.value,
  }));


  return (
    <Animated.View style={[styles.container, isFocused && styles.containerFocused, animatedContainerStyle]}>
      <IconButton
        name="search"
        size={20}
        color="#666"
        style={styles.searchIcon}
        onPress={searchBooks}
      />
      <TextInput
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search books..."
        style={styles.input}
        placeholderTextColor="#999"
        onFocus={handleFocus}
        onBlur={handleBlur}
        returnKeyType="search"
        onSubmitEditing={searchBooks}
      />
      {searchText.length > 0 && (
        <IconButton
          name="close-circle"
          size={20}
          color="#666"
          style={styles.icon}
          onPress={clearSearch}
        />
      )}
    </Animated.View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    height: 40,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  containerFocused: {
    backgroundColor: '#fff',
    borderColor: '#007AFF',
    shadowOpacity: 0.2,
  },
  searchIcon: {
    marginRight: 8,
  },
  clearIcon: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
    fontWeight: '400',
  },
});

export default SearchBar;