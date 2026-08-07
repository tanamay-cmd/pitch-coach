import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The coach only ever talks to its own /api routes, so no remote origins are needed.
  // Camera + mic are same-origin, which is what getUserMedia requires anyway.
  reactStrictMode: true,
}

export default nextConfig
