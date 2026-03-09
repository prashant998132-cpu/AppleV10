/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname);
    return config;
  },
  images: {
    remotePatterns: [
      { protocol:'https', hostname:'fal.run' },
      { protocol:'https', hostname:'*.fal.ai' },
      { protocol:'https', hostname:'image.pollinations.ai' },
      { protocol:'https', hostname:'api-inference.huggingface.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=self, microphone=self, geolocation=self' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
