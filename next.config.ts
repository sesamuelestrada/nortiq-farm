import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    mcpServer: process.env.NODE_ENV === 'development',
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
  },
  compress: true,
}

export default nextConfig
