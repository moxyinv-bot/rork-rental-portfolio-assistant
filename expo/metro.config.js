const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = path.resolve(
  __dirname,
  "scripts/metro-transformer.js"
);

module.exports = config;
