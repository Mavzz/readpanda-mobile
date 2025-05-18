import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator, Pressable } from "react-native";
import { loginUser, getUserPreferences } from "../services/api";
import { storeToken } from "../utils/storage";
import Background from "../components/Background";

const Login = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {

      const data = await loginUser(username, password);
      console.log(`Root username: ${data.token}`);
      const preferences = await getUserPreferences(data.token, username);

      await storeToken(data.token, username);
      navigation.popTo("InterestScreen", { username ,preferences});
    } catch (error) {
      Alert.alert("Login failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Background>
      <View style ={styles.container}>
        <View > 
          <Text style={styles.logintext}>Login</Text>
          <View style={{ flexDirection: "row", alignItems: "center",  paddingBottom: 10 }}>
            <Text style={styles.title}>Don't have an account?</Text>
            <Pressable onPress={() => navigation.navigate("SignUp")}>
              <Text style={styles.signUpText}> sign up!</Text>
            </Pressable>
          </View>
        </View>
        <View >
          <TextInput
            style={styles.input}
            placeholder="username"
            placeholderTextColor="#548C2F"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#548C2F"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
          />
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <View>
            <Pressable onPress={handleLogin} style={styles.loginButton}>
              <Text style={styles.loginButtonText}>login</Text>
            </Pressable>
          </View>
        )}
        <View>
          <Text>SSO place holder</Text>
        </View>
      </View>
    </Background>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 50,
  },
  logintext: {
    fontSize: 24,
    //marginBottom: 20,
    color: "#E34A6F",
    fontWeight: "400",
  },
  signUpText: {
    fontSize: 16,
    color: "#548C2F",
    fontStyle: 'italic',
  },
  title: {
    fontSize: 14,
    //marginBottom: 20,
    textAlign: "center",
    color: "#0A210F",
  },
  input: {
    height: 40,
    width: "100%",
    backgroundColor: "#DBD9D8",
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 12,
    color: "#548C2F", // green text
    fontSize: 18,
    // Remove border
    borderWidth: 0,
  },
  loginButton: {
    backgroundColor: "#3B120B",
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 36,
    alignSelf: "flex-end",
    marginTop: 10,
  },
  loginButtonText: {
    color: "#f15c8e",
    fontSize: 16,
    fontWeight: "bold",
    fontStyle: "italic",
    textAlign: "center",
  },
});

export default Login;
