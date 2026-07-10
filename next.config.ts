import type { NextConfig } from 'next';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/explore';

const config: NextConfig = {
  basePath,
  assetPrefix: basePath,
  reactStrictMode: true,
};

export default config;