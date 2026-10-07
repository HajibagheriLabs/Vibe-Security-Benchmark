#!/usr/bin/env bash
set -euo pipefail

# Ensure we're in the project root
cd "$(dirname "$0")/.."

echo "🔧 Setting up Next.js project dependencies..."

# Check Node.js version
REQUIRED_NODE_VERSION="18.17.0"
CURRENT_NODE_VERSION=$(node --version | sed 's/v//')
if ! printf '%s\n%s\n' "$REQUIRED_NODE_VERSION" "$CURRENT_NODE_VERSION" | sort -V -C; then
  echo "❌ Node.js >= $REQUIRED_NODE_VERSION required (found $CURRENT_NODE_VERSION)"
  exit 1
fi
echo "✅ Node.js $CURRENT_NODE_VERSION"

# Check npm version
REQUIRED_NPM_VERSION="9.0.0"
CURRENT_NPM_VERSION=$(npm --version)
if ! printf '%s\n%s\n' "$REQUIRED_NPM_VERSION" "$CURRENT_NPM_VERSION" | sort -V -C; then
  echo "❌ npm >= $REQUIRED_NPM_VERSION required (found $CURRENT_NPM_VERSION)"
  exit 1
fi
echo "✅ npm $CURRENT_NPM_VERSION"

# Install dependencies
echo "📦 Installing dependencies..."
if [ -f package-lock.json ]; then
  npm ci --prefer-offline --no-audit --no-fund
else
  npm install --prefer-offline --no-audit --no-fund
fi

# Verify Next.js installation
if ! npx next --version >/dev/null 2>&1; then
  echo "❌ Next.js not found after installation"
  exit 1
fi
echo "✅ Next.js $(npx next --version)"

# Generate Prisma client if schema exists
if [ -f prisma/schema.prisma ]; then
  echo "🗄️  Generating Prisma client..."
  npx prisma generate
fi

# Build to verify everything works
echo "🏗️  Building project to verify setup..."
npm run build

echo "✅ Setup complete!"