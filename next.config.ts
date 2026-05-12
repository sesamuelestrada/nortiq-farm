import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    mcpServer: process.env.NODE_ENV === 'development',
  },
}

export default nextConfig
