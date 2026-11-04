/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable Webpack disk caching to prevent Windows .pack.gz file lock rename failures
      config.cache = false;
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
