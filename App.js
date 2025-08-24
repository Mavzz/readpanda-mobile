import AppNavigator from "./src/navigation/AppNavigator";
import SplashScreen from 'react-native-splash-screen';
import { useEffect } from "react";

const App = () => {

  useEffect(() => {
  // Hide the splash screen after some time or when your initial data is loaded
  SplashScreen.hide();
}, []);

  return (
    <AppNavigator />
  );
}

export default App;