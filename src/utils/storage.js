import AsyncStorage from "@react-native-async-storage/async-storage";

export const storeToken = async (token, username) => {
  try {
    const jsonValue = JSON.stringify(token);
    await AsyncStorage.setItem(`token_${username}`, jsonValue);
  } catch (e) {
    throw new Error("Error saving data to AsyncStorage");
  }
};