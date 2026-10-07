#!/usr/bin/env bash
# Setup script for Next.js dependency installation
# Ensures strict, reproducible, and secure dependency installation

set -euo pipefail

echo "Installing dependencies with strict mode..."

# 1. Install dependencies using the lockfile
# --frozen-lockfile ensures no changes to package-lock.json
# --prefer-offline speeds up local installs
npm ci --prefer-offline

# 2. Verify that all packages were installed correctly
# npm ls --depth=0 helps identify missing or broken dependencies
echo "Verifying dependency tree..."
npm ls --depth=0 || {
  echo "Dependency tree verification failed. Check for missing or incompatible packages."
  exit 1
}

# 3. Run postinstall scripts if they exist (since ignore-scripts=true in .npmrc)
# This is necessary for packages that require build steps after install
echo "Running postinstall scripts..."
npm run postinstall || echo "No postinstall script found or it failed. Continuing..."

# 4. Generate a type definition for the environment variables (if using tsc)
# This is a common Next.js practice to ensure type safety for process.env
echo "Generating type definitions for environment variables..."
npm run generate:env-types || echo "No generate:env-types script found or it failed. Continuing..."

echo "Dependency installation and setup complete."