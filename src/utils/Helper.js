import CryptoJS from "react-native-crypto-js";
import { SECRET_KEY } from "@env";
import Constants from 'expo-constants';
import * as Network from 'expo-network';


// Encrypt the password
const encryptedPassword = (password) => {
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
};

const getBackendUrl = async(path = "") => {

  //const apiUrl = `https://${Constants.expoConfig.hostUri.split(':')[0]}:3000`;

  let backendUrl;
    try {
      
      const ip = "192.168.0.105" //await Network.getIpAddressAsync();
      const port = 3000; // your backend port
      backendUrl = `http://${ip}:${port}${path}`;

    return backendUrl;

  } catch (e) {
    console.warn("⚠️ Failed to get local IP, falling back to localhost");
    return `http://localhost:3000${path}`;
  }
};

const SignUpType = {
  Email : "Email",
  Google : "Google",
  Facebook : "Facebook",
  Other : "Other"
}

export { encryptedPassword, getBackendUrl, SignUpType };
