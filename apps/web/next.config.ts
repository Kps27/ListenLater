import type { NextConfig } from 'next';

const SHARE_API = 'https://bye-portraits-eagles-asking.trycloudflare.com';

const nextConfig: NextConfig = {
  experimental: { externalDir: true },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || (process.env.VERCEL ? SHARE_API : 'http://127.0.0.1:3333'),
  },
};

export default nextConfig;
