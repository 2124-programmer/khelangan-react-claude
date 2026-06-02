// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Required for @tanstack/react-query v5 which ships as an ESM package
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
