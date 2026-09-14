import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Safety net for the Prisma driver-adapter runtime files (and any engine
  // binaries it needs): Next's file tracer sometimes misses Prisma's
  // dynamically-resolved paths inside node_modules/.prisma and
  // node_modules/@prisma. Cheap to include explicitly, and required for the
  // desktop app build (macOS) as well as the Docker image (Linux) to bundle
  // the correct native files into .next/standalone.
  outputFileTracingIncludes: {
    '/**': [
      './node_modules/.prisma/**/*',
      './node_modules/@prisma/**/*',
    ],
  },
};

export default nextConfig;
