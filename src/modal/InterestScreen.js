import React, { useState } from "react";
import { updateUserPreferences } from "../api/api";
import { View, Text, StyleSheet, FlatList, Button } from "react-native";
import { CheckBox } from "react-native-elements";
import { useNavigation } from "@react-navigation/native";

const InterestScreen = ({route}) => {

  const navigation = useNavigation();
  const username  = route.params.username;
  const preferencess = route.params.preferences;
  console.log(`InterestScreen preferencess: ${username}`);
  const [Interests, setInterests] = useState(preferencess);

  const togglePreference = (id) => {
    setInterests((prevPreferences) =>
      prevPreferences.map((pref) =>
        pref.preference_id === id ? { ...pref, preference_value: !pref.preference_value } : pref
      )
    );
  };

  const renderItem = ({ item }) => (
    <CheckBox
      key={item.preference_id}
      title={item.preference_type}
      checked={item.preference_value}
      onPress={() => togglePreference(item.preference_id)}
    />
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button title="Save" onPress={() => updateUserPreferences(username, Interests)} />
      ),
    });
  }, [navigation, username]);

  return (
    <View style={styles.container}>
      <FlatList
        data={Interests}
        renderItem={renderItem}
        keyExtractor={(item) => item.preference_id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "flex-start",
  },
  buttonContainer: {
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
});

export default InterestScreen;