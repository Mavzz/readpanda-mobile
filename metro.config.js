const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {withSentryConfig} = require('@sentry/react-native/metro');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const projectRoot = __dirname;

const config = {
  watchFolders: [projectRoot],
  resolver: {
    nodeModulesPaths: [path.resolve(projectRoot, 'node_modules')],
  },
};

// withSentryConfig stamps a Debug ID into the bundle and its source map, so
// Sentry can match a release build's stack traces to the right map.
module.exports = withSentryConfig(mergeConfig(getDefaultConfig(projectRoot), config));