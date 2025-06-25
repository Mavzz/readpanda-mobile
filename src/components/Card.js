import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { cardStyles } from "../styles/global";

const bookCard = ({ book, onPress }) => {
  return (
    <Pressable onPress={onPress} style={cardStyles.container}>
      <Image source={{ uri: book.cover_image_url }} style={cardStyles.coverImage} />
      {/* You can add more details like title or author here if you want */}
      <Text style={cardStyles.title}>{book.title}</Text>
    </Pressable>
  ); 
};

export { bookCard };