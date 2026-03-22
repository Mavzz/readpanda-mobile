import React, { useState, useCallback } from 'react';
import { TextInput, StyleSheet, View, Keyboard } from 'react-native';
import { iconButton as IconButton } from '../components/Button';
import log from '../utils/logger';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { DS } from '../styles/global';

const SearchBar = () => {
  const [isFocused, setIsFocused] = useState(false);
  const [searchText, setSearchText] = useState('');

  const containerWidth = useSharedValue('95%');
  const inputScale = useSharedValue(1);

  const searchBooks = () => {
    log.info(`Searching for book: ${searchText}`);
    setSearchText('');
    Keyboard.dismiss();
    log.info('Search functionality is not yet implemented.');
    alert('Search functionality is not yet implemented.');
  };

  const clearSearch = () => {
    setSearchText('');
    log.info('Cleared search input.');
  };

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

  const animatedContainerStyle = useAnimatedStyle(() => ({
    width: containerWidth.value,
    transform: [{ scale: inputScale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        isFocused && styles.containerFocused,
        animatedContainerStyle,
      ]}
    >
      <IconButton
        name="search"
        size={18}
        color={DS.colors.onSurfaceVariant}
        onPress={searchBooks}
      />
      <TextInput
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search books..."
        style={styles.input}
        placeholderTextColor={DS.colors.onSurfaceVariant}
        onFocus={handleFocus}
        onBlur={handleBlur}
        returnKeyType="search"
        onSubmitEditing={searchBooks}
      />
      {searchText.length > 0 && (
        <IconButton
          name="close-circle"
          size={18}
          color={DS.colors.onSurfaceVariant}
          onPress={clearSearch}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.surfaceContainerLowest,
    borderRadius: DS.radius.md,
    height: 40,
    paddingHorizontal: 12,
  },
  containerFocused: {
    shadowColor: DS.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: DS.colors.onSurface,
    paddingVertical: 8,
    marginLeft: 8,
  },
});

export default SearchBar;