import AsyncStorage from "@react-native-async-storage/async-storage";
import { encryptedPassword, fetchapiURL} from "../utils/Helper";
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
// import axios from 'axios';

// // Initialize Google Sign-In

const API_URL = fetchapiURL();

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

// async function signInAndGetDriveToken() {
//   await GoogleSignin.hasPlayServices();
//   const userInfo = await GoogleSignin.signIn();
//   const tokens = await GoogleSignin.getTokens();
//   return tokens.accessToken;
// }

// // Consider renaming to getBookItem for clarity
// export const getBookItem = async (fileId = '1z8b2k3d4e5f6g7h8i9j0k1l2m3n4o5p6') => {
//   try {
//     // Configure before sign-in
//     GoogleSignin.configure({
//       scopes: ['https://www.googleapis.com/auth/drive.readonly'],
//       webClientId: '703301065299-nd3d9ljsaiv71rlek1i24bv7qeahrjcd.apps.googleusercontent.com',
//       offlineAccess: true,
//     });

//     const accessToken = await signInAndGetDriveToken();

//     const response = await axios.get(
//       `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//         responseType: 'arraybuffer', // Use arraybuffer for React Native
//       }
//     );

//     // You may need to convert arraybuffer to base64 or another format for use in React Native
//     // Example: const base64Data = Buffer.from(response.data, 'binary').toString('base64');
//     // return base64Data;

//     console.log("Book item fetched successfully");
//     // Return the raw data or process it as needed
//     return response.data;
//   } catch (error) {
//     console.error("Error fetching book item:", error);
//     throw error;
//   }
// };