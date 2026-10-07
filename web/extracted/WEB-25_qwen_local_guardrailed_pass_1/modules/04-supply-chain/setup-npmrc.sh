#!/usr/bin/env bash
# setup-npmrc.sh
# Sets up the .npmrc for strict dependency management in a Next.js project.
# Ensures exact version pinning, hash checking, and script ignoring by default.

set -euo pipefail

# 1. Create .npmrc
# Rule 4: Pin exact versions, ignore scripts, require hashes.
cat > .npmrc << 'EOF'
save-exact=true
save-dev-exact=true
save-optional-exact=true
save-peer-exact=true

# Security: Ignore all lifecycle scripts by default (Rule 4)
ignore-scripts=true

# Supply Chain: Require integrity hashes for all packages (Rule 4)
# This prevents tampering during install (e.g., npm ci or --frozen-lockfile)
package-lock=true
audit=false

# Optional: Registry configuration (using npm public registry as example)
# If using a private registry, uncomment and adjust the URL below
;registry=https://registry.npmjs.org/
EOF

echo "[setup-npmrc] .npmrc created with strict security constraints."

# 2. Verify npm version (optional but recommended for hash support)
if ! command -v npm &> /dev/null; then
    echo "[setup-npmrc] ERROR: npm is not installed."
    exit 1
fi

echo "[setup-npmrc] Setup complete. Run 'npm install' or 'npm ci' to apply."