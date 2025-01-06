import CryptoJS from "react-native-crypto-js";
import { SECRET_KEY } from "@env";
// Encrypt the password
const encryptedPassword = (password) => {
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
};

export default encryptedPassword;
