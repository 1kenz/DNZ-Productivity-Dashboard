#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "📦 [1/6] Installing app dependencies..."
npm install

echo "🧬 [2/6] Generating Prisma client (native macOS engine)..."
npx prisma generate

echo "🏗  [3/6] Building the Next.js app (standalone output)..."
npm run build

echo "🧹 [4/6] Assembling desktop app resources..."
rm -rf desktop/resources
mkdir -p desktop/resources/app-server
cp -R .next/standalone/. desktop/resources/app-server/
mkdir -p desktop/resources/app-server/.next
cp -R .next/static desktop/resources/app-server/.next/static
cp -R public desktop/resources/app-server/public

mkdir -p desktop/resources/prisma-schema
cp prisma/schema.prisma desktop/resources/prisma-schema/schema.prisma

# Plain SQL to create the schema on first launch — generated once here (where
# we have real internet access for Prisma's schema-engine) so the packaged
# app only ever needs a plain "pg" connection at runtime, not the Prisma CLI
# (whose "db push" pulls in a local dev-server layer that doesn't play well
# packaged/offline).
echo "📝 Generating first-run database schema (init.sql)..."
# This diff is purely schema-to-SQL (from an empty database to our schema) —
# it doesn't need a real, reachable database. But prisma.config.js reads its
# datasource URL from process.env.DATABASE_URL, and this bare `npx prisma`
# invocation isn't run through Next's own .env loading, so DATABASE_URL can
# come through empty here and crash the schema engine. Pass a syntactically
# valid placeholder explicitly so this step never depends on Docker's
# Postgres (or anything else) actually being up.
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/placeholder" \
  npx prisma migrate diff --from-empty --to-schema=prisma/schema.prisma --script \
  > desktop/resources/prisma-schema/init.sql

if [ ! -s desktop/resources/prisma-schema/init.sql ]; then
  echo "❌ init.sql was generated empty — schema diff likely failed silently."
  exit 1
fi

cp public/icons/icon-512.png desktop/resources/icon.png

echo "📦 [5/6] Installing Electron + electron-builder..."
cd desktop
npm install

ARCH="$(uname -m)"
if [ "$ARCH" = "arm64" ]; then
  ARCH_FLAG="--arm64"
else
  ARCH_FLAG="--x64"
fi

echo "🚀 [6/6] Building the macOS app ($ARCH)..."
export CSC_IDENTITY_AUTO_DISCOVERY=false
npx electron-builder --mac $ARCH_FLAG

echo ""
echo "✅ Done! Find it under desktop/dist/ — open the .dmg and drag the app into Applications."
echo "   First launch: right-click the app → Open (it's not code-signed, so Gatekeeper needs one manual approval)."
