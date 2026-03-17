import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { cardStyles } from '../styles/global';
import { log } from '../utils/logger';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const NewBookCard = ({ book, onPress, style }) => {
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    'worklet';
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    'worklet';
    scale.value = withSpring(1, { damping: 15 });
  };

  const handlePress = () => {
    if (onPress && book) {
      onPress(book);
    }
  };

  const handleImageError = () => {
    setImageError(true);
    log('Image load failed for book:', book?.title || 'Unknown');

    // Retry image loading up to 3 times with exponential backoff
    if (retryCount < 3) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImageError(false);
      }, Math.pow(2, retryCount) * 1000);
    }
  };

  const renderImageContent = () => {
    if (imageError) {
      return (
        <View style={cardStyles.gridImagePlaceholder}>
          <Text style={cardStyles.gridPlaceholderIcon}>📚</Text>
          <Text style={cardStyles.gridPlaceholderTitle} numberOfLines={2}>
            {book?.title || 'Book'}
          </Text>
        </View>
      );
    }

    return (
      <Image
        source={{ uri: book?.cover_image_url }}
        style={cardStyles.gridCoverImage}
        onError={handleImageError}
        key={`${book?.id || 'book'}-${retryCount}`}
      />
    );
  };

  return (
    <AnimatedTouchableOpacity
      style={[cardStyles.gridBookCard, animatedStyle, style]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      accessible={true}
      accessibilityLabel={`Book: ${book?.title || 'Untitled'} by ${book?.author_name || 'Unknown Author'}`}
      accessibilityRole="button"
    >
      <View style={cardStyles.gridBookCover}>
        {renderImageContent()}
      </View>
      <View style={cardStyles.gridBookInfo}>
        <Text style={cardStyles.gridBookTitle} numberOfLines={2}>
          {book?.title || 'Untitled'}
        </Text>
        <Text style={cardStyles.gridBookAuthor} numberOfLines={1}>
          {book?.author_name || 'Unknown Author'}
        </Text>
        {book?.reading_progress && (
          <View style={cardStyles.progressContainer}>
            <View style={cardStyles.progressBar}>
              <View
                style={[
                  cardStyles.progressFill,
                  { width: `${book.reading_progress}%` },
                ]}
              />
            </View>
            <Text style={cardStyles.progressText}>
              {Math.round(book.reading_progress)}%
            </Text>
          </View>
        )}
      </View>
    </AnimatedTouchableOpacity>
  );
};

export { NewBookCard as newBookCard };