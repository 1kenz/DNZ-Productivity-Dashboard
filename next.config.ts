import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// DNZ About metadata (core/standards/about-standard.md §3): build facts come
// from the build, never from source. Release builds:
//   DNZ_CHANNEL=stable DNZ_ENVIRONMENT=production npm run build
const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };
const commit = (() => {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "unknown";
  }
})();
const now = new Date().toISOString();

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_APP_BUILD: now.slice(0, 16).replace(/[-T:]/g, ""),
    NEXT_PUBLIC_APP_COMMIT: commit,
    NEXT_PUBLIC_APP_RELEASE_DATE: now.slice(0, 10),
    NEXT_PUBLIC_APP_CHANNEL: process.env.DNZ_CHANNEL ?? "dev",
    NEXT_PUBLIC_APP_ENVIRONMENT: process.env.DNZ_ENVIRONMENT ?? "development",
  },
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
