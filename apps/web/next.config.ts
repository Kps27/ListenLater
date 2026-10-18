import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: { externalDir: true },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3333',
  },
};

export default nextConfig;
