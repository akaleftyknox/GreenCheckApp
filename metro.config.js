// metro.config.js

const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  config.resolver.alias = {
    '@': __dirname,
  };

  return config;
})();