// The logger writes to the console asynchronously; keep test output clean.
jest.mock('./src/utils/logger', () => ({
  __esModule: true,
  default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
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
