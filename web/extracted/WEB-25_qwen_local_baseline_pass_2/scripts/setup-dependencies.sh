#!/usr/bin/env bash
# scripts/setup-dependencies.sh
# Setup script for Next.js project dependency installation

set -euo pipefail

echo "Starting dependency installation for Next.js project..."

# 1. Clean previous installation
echo "Cleaning previous node_modules and package-lock.json..."
rm -rf node_modules
rm -f package-lock.json

# 2. Clear npm cache (optional but recommended for fresh starts)
echo "Clearing npm cache..."
npm cache clean --force || true

# 3. Install dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps

# 4. Verify installation
echo "Verifying installation..."
if [ ! -d "node_modules" ]; then
  echo "Error: node_modules directory not found after installation."
  exit 1
fi

# 5. Run a basic health check (optional)
# echo "Running basic health check..."
# npm run build || echo "Build step failed, but dependencies are installed."

echo "Dependency installation completed successfully."