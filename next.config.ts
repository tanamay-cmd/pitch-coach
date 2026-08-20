import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The coach only ever talks to its own /api routes, so no remote origins are needed.
  // Camera + mic are same-origin, which is what getUserMedia requires anyway.
  reactStrictMode: true,

  // `/api/scenarios` reads scenarios/ with fs at request time, so nothing imports those
  // files and Next's static tracing cannot see them. Without this they are absent from
  // the serverless bundle and a deployed instance shows only the built-in packs.
  outputFileTracingIncludes: {
    '/api/scenarios': ['./scenarios/**/*.json'],
  },
}

export default nextConfig
