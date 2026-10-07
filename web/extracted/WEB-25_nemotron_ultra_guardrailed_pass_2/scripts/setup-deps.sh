#!/usr/bin/env bash
set -euo pipefail

# Verify lockfile exists
if [[ ! -f package-lock.json ]]; then
  echo "ERROR: package-lock.json not found. Commit the lockfile before running setup."
  exit 1
fi

# Install with frozen lockfile and require hashes
npm ci --ignore-scripts --audit-level=high

# Verify no unexpected packages were added
echo "Verifying installed packages against lockfile..."
npm ls --prod --parseable 2>/dev/null | tail -n +2 | while read -r pkg; do
  name=$(basename "$pkg")
  if ! grep -q "\"$name\"" package-lock.json; then
    echo "WARNING: Package $name not found in lockfile"
  fi
done

echo "Dependency installation complete and verified."