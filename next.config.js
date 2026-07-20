/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
}

module.exports = nextConfig
