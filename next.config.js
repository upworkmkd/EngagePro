/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude Handlebars from client-side bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        handlebars: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
