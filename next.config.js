/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config, { isServer }) => {
    // Configuração para resolver módulos React Native desnecessários no alasql
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "react-native-fs": false,
      "react-native-fetch-blob": false,
      "react-native": false,
    };

    // Ignorar módulos React Native durante a resolução
    config.resolve.alias = {
      ...config.resolve.alias,
      "react-native-fs": false,
      "react-native-fetch-blob": false,
    };

    // Configuração adicional para ignorar módulos problemáticos
    config.plugins.push(
      new (require("webpack").IgnorePlugin)({
        resourceRegExp: /^(react-native-fs|react-native-fetch-blob)$/,
      })
    );

    config.experiments = { ...config.experiments, topLevelAwait: true };
    config.infrastructureLogging = { level: "error" };

    return config;
  },
};

module.exports = nextConfig;
