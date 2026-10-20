// The logger writes to the console asynchronously; keep test output clean.
jest.mock('./src/utils/logger', () => ({
  __esModule: true,
  default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Sentry needs its native module; tests only need the calls to be no-ops.
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: (component) => component,
  setUser: jest.fn(),
  captureException: jest.fn(),
  captureFeedback: jest.fn(),
  reactNavigationIntegration: () => ({ registerNavigationContainer: jest.fn() }),
}));

// Opens the native photo picker; tests call the callback themselves.
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
  launchCamera: jest.fn(),
}));

// Native views most components use; rendered as plain Views in tests.
jest.mock('react-native-vector-icons/Ionicons', () => {
  const { View } = require('react-native');
  return ({ name, ...props }) => <View testID={`icon-${name}`} {...props} />;
});
jest.mock('react-native-linear-gradient', () => {
  const { View } = require('react-native');
  const LinearGradient = (props) => <View {...props} />;
  return { __esModule: true, default: LinearGradient, LinearGradient };
});
