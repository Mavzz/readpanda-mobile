/**
 * @format
 */

// Must run before anything else: secureStorage generates its key with
// crypto.getRandomValues, which Hermes doesn't provide on its own.
import 'react-native-get-random-values';
import {AppRegistry} from 'react-native';
import App from './App'; // 1. Import your main App component
// Register the component as 'main' to match the native entry point
AppRegistry.registerComponent('main', () => App);