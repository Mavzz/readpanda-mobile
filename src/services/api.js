import { API_URL } from "@env";
import encryptedPassword from "../utils/Helper";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const loginUser = async (username, password) => {
  console.log('API_URL: ', API_URL);
  console.log(`${API_URL}/auth/login`);
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password: encryptedPassword(password) }),
  });

  if (!response.ok) {
    throw new Error(`Login failed with status ${response.status}`);
  }

  return response.json();
};

export const getUserPreferences = async (token, username) => {
  console.log(`getUserPreferences token: ${token}`);
  const response = await fetch(`${API_URL}/user/preferences?username=${username}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`There was an error fetching the preferences`);
  }
  return response.json();

};

export const updateUserPreferences = async ( username, preferences, isUpdated, navigation) => {
  
  if (!isUpdated) {
    navigation.popTo("Root", { username });
  }else{
    
    const isTokenExists = await AsyncStorage.getItem(`token_${username}`);
    
    if (isTokenExists) {
      try{
        console.log(`updateUserPreferences token: ${isTokenExists}`);
        console.log(`updateUserPreferences username: ${API_URL}/user/preferences?username=${username}`);
        const response = await fetch(`${API_URL}/user/preferences?username=${username}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${isTokenExists}`,
          },
          body: JSON.stringify({ username, preferences }),
        }); 
    
        if (response.status === 200) {
    
          console.log("Preferences updated successfully");
          navigation.popTo("Root", { username });
        
        } else if (response.status === 400) {
          throw new Error("Bad Request: Please check the data sent to the server.");
        } else if (response.status === 401) {
          throw new Error("Unauthorized: Please check your authentication token.");
        } else if (response.status === 500) {
          throw new Error("Internal Server Error: Please try again later.");
        } else {
          throw new Error(`Unexpected error: ${response.statusText}`);
        }
      } catch (error) {
        Alert.alert("Preferences Update failed", error.message);
      }
    } 
    else {
      throw new Error(`Token does not exist`);
    }
  }
};