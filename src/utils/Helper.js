import CryptoJS from "react-native-crypto-js";
import { SECRET_KEY } from "@env";
import Constants from 'expo-constants';


// Encrypt the password
const encryptedPassword = (password) => {
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
};

const fetchapiURL = () => {
  const apiUrl = `http://${Constants.expoConfig.hostUri.split(':')[0]}:3000`;
  return apiUrl;
};

export { encryptedPassword, fetchapiURL };
