import { View, Text, Pressable } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";

import { loginStyles } from "../styles/global";

const primaryButton = (props) => (
  <View>
    <Pressable onPress={props.onPress} style={loginStyles.loginButton}>
      <Text style={loginStyles.loginButtonText}>{props.title}</Text>
    </Pressable>
  </View>
);

const SignOutButton = (props) => (
  <View>
    <Pressable onPress={props.onPress}>
      <Icon name="sign-out-alt" size={24} color="#000000" />
    </Pressable>
  </View>
);

export { primaryButton, SignOutButton };
