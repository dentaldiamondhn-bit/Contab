/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      root: process.cwd(),
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
}

module.exports = nextConfig
