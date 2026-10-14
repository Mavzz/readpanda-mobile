module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/src/**/*.test.js'],
  // React Native libraries ship untranspiled ESM/Flow, so let Babel at them.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|@bottom-tabs|react-native-.*|zustand)/)',
  ],
  clearMocks: true,
};
