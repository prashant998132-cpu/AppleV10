/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: false, // false = no double-render in dev, better for streaming
  typescript: { ignoreBuildErrors: true },
  eslint:     { ignoreDuringBuilds: true },
  compress: true,
  poweredByHeader: false,
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname);
    config.resolve.alias['canvas'] = false;
    return config;
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol:'https', hostname:'fal.run' },
      { protocol:'https', hostname:'*.fal.ai' },
      { protocol:'https', hostname:'image.pollinations.ai' },
      { protocol:'https', hostname:'api-inference.huggingface.co' },
      { protocol:'https', hostname:'images.unsplash.com' },
      { protocol:'https', hostname:'*.pexels.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',      value: 'camera=self, microphone=self, geolocation=self' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
