const path = require("path");

let upstreamTransformer;

try {
  upstreamTransformer = require(path.resolve(
    __dirname,
    "../node_modules/@expo/metro-config/babel-transformer"
  ));
} catch {
  upstreamTransformer = require("@expo/metro-config/babel-transformer");
}

module.exports = {
  transform: async ({ src, filename, options }) => {
    if (filename && filename.includes("@ai-sdk/provider-utils/dist/index.mjs")) {
      src = src.replace(/return import\(id\);/g, "return Promise.resolve(null);");
    }
    return upstreamTransformer.transform({ src, filename, options });
  },
};
