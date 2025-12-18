/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: { and: [/\.(js|ts|jsx|tsx|md|mdx)$/] },
      use: ["@svgr/webpack"],
    });
    return config;
  },
};

module.exports = nextConfig;

