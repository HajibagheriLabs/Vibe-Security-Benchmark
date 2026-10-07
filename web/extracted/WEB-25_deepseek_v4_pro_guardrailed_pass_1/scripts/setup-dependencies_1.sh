#!/usr/bin/env bash
# Dependency setup script for a Next.js project.
# Enforces AGENT_RULES §4: verify packages, pin exact versions, commit lockfile,
# and never run untrusted lifecycle scripts.

set -euo pipefail

# ---------------------------------------------------------------------------
# 1. Verify required tooling
# ---------------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is required but not found in PATH." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is required but not found in PATH." >&2
  exit 1
fi

NODE_VERSION="$(node --version)"
NPM_VERSION="$(npm --version)"
echo "Using Node ${NODE_VERSION} and npm ${NPM_VERSION}"

# ---------------------------------------------------------------------------
# 2. Verify project structure
# ---------------------------------------------------------------------------
if [[ ! -f "package.json" ]]; then
  echo "ERROR: package.json not found. Run this script from the project root." >&2
  exit 1
fi

if [[ ! -f ".npmrc" ]]; then
  echo "ERROR: .npmrc not found. The project .npmrc enforces security policy." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 3. Verify lockfile consistency before touching node_modules
# ---------------------------------------------------------------------------
if [[ -f "package-lock.json" ]]; then
  echo "Verifying lockfile is in sync with package.json..."
  # --package-lock-only ensures we do not mutate node_modules during verification.
  npm install --package-lock-only --ignore-scripts --no-audit --no-fund
  if ! git diff --quiet -- package-lock.json; then
    echo "ERROR: package-lock.json is out of sync with package.json." >&2
    echo "Run 'npm install --package-lock-only' and commit the updated lockfile." >&2
    exit 1
  fi
  echo "Lockfile is in sync."
else
  echo "WARNING: package-lock.json not found. It will be generated during install."
  echo "Commit the generated lockfile to the repository."
fi

# ---------------------------------------------------------------------------
# 4. Install dependencies using the locked, script-disabled policy
# ---------------------------------------------------------------------------
# Use `npm ci` when a lockfile exists for a clean, reproducible install.
# Fall back to `npm install` only when generating the lockfile for the first time.
if [[ -f "package-lock.json" ]]; then
  echo "Installing dependencies with 'npm ci' (clean, reproducible)..."
  npm ci --ignore-scripts --no-audit --no-fund
else
  echo "Installing dependencies with 'npm install' (initial lockfile generation)..."
  npm install --ignore-scripts --no-audit --no-fund
fi

# ---------------------------------------------------------------------------
# 5. Security audit (informational; does not block install)
# ---------------------------------------------------------------------------
echo "Running npm audit for known vulnerabilities..."
npm audit --audit-level=high || {
  echo "WARNING: npm audit reported high-severity vulnerabilities." >&2
  echo "Review and remediate before deployment." >&2
}

# ---------------------------------------------------------------------------
# 6. Verify no lifecycle scripts were executed unexpectedly
# ---------------------------------------------------------------------------
# With ignore-scripts=true, no package install scripts should have run.
# This is a defensive check; it does not prove scripts were blocked, but
# it confirms the policy is active in the generated environment.
if npm config get ignore-scripts | grep -q "false"; then
  echo "ERROR: ignore-scripts is disabled. Refusing to continue." >&2
  exit 1
fi

echo "Dependency setup complete."
echo "Reminder: commit package-lock.json and never commit node_modules or .env files."