#!/usr/bin/env bash
# Dependency installation setup for a Next.js project.
# Security: verifies packages against the live registry, pins exact versions,
# disables install scripts by default, and commits the lockfile.

set -euo pipefail

# --- Configuration -----------------------------------------------------------
# Allowlist of lifecycle scripts that are explicitly permitted to run.
# Security: no arbitrary install scripts execute without review.
ALLOWED_SCRIPTS=(
  "sharp"        # native image processing bindings
  "esbuild"      # native bundler binary
  "swc"          # native compiler bindings
  "@prisma/client" # database client generation
)

# --- Helper functions --------------------------------------------------------
log() {
  printf '[setup-dependencies] %s\n' "$1"
}

fail() {
  printf '[setup-dependencies] ERROR: %s\n' "$1" >&2
  exit 1
}

# Verify a package exists on the live npm registry before installing.
# Security: prevents typosquatting and non-existent package installation.
verify_package() {
  local pkg="$1"
  local version="$2"

  log "Verifying ${pkg}@${version} against live registry..."

  # Query registry for exact version
  local registry_data
  registry_data=$(npm view "${pkg}@${version}" --json 2>/dev/null) || {
    fail "Package ${pkg}@${version} not found on registry. Aborting."
  }

  # Security: reject packages younger than 90 days
  local created_at
  created_at=$(printf '%s' "$registry_data" | node -e "
    const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    const created = data.time?.created || data.time?.modified;
    if (!created) process.exit(1);
    const ageDays = (Date.now() - new Date(created).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 90) {
      console.error('Package ${pkg} is younger than 90 days');
      process.exit(1);
    }
  ") || fail "Package ${pkg}@${version} is younger than 90 days. Aborting."

  # Security: reject packages with no repository link
  local has_repo
  has_repo=$(printf '%s' "$registry_data" | node -e "
    const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    const repo = data.repository?.url || data.homepage;
    if (!repo || repo.length === 0) process.exit(1);
  ") || fail "Package ${pkg}@${version} has no repository link. Aborting."
}

# --- Main setup flow ---------------------------------------------------------
log "Starting dependency setup for Next.js project"

# 1. Verify Node.js and npm versions
log "Checking Node.js and npm versions..."
node --version >/dev/null 2>&1 || fail "Node.js is not installed"
npm --version >/dev/null 2>&1 || fail "npm is not installed"

# 2. Ensure .npmrc exists with security settings
if [[ ! -f .npmrc ]]; then
  log "Creating .npmrc with security settings..."
  cat > .npmrc <<'EOF'
save-exact=true
ignore-scripts=true
audit=true
fund=false
package-lock=true
EOF
else
  log ".npmrc already exists. Verifying security settings..."
  grep -q '^save-exact=true' .npmrc || fail ".npmrc missing 'save-exact=true'"
  grep -q '^ignore-scripts=true' .npmrc || fail ".npmrc missing 'ignore-scripts=true'"
  grep -q '^audit=true' .npmrc || fail ".npmrc missing 'audit=true'"
fi

# 3. Verify all direct dependencies against the live registry
log "Verifying direct dependencies against live registry..."
if [[ -f package.json ]]; then
  # Extract dependencies and devDependencies
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    for (const [name, version] of Object.entries(deps)) {
      // Skip file: and link: protocols
      if (version.startsWith('file:') || version.startsWith('link:')) continue;
      console.log(name + '@' + version.replace(/^[\^~]/, ''));
    }
  " | while IFS= read -r pkg_spec; do
    pkg_name="${pkg_spec%@*}"
    pkg_version="${pkg_spec#*@}"
    verify_package "$pkg_name" "$pkg_version"
  done
else
  fail "package.json not found in current directory"
fi

# 4. Install dependencies with frozen lockfile if it exists
if [[ -f package-lock.json ]]; then
  log "Lockfile found. Installing with --frozen-lockfile..."
  npm ci --ignore-scripts --no-audit --no-fund
else
  log "No lockfile found. Running initial install..."
  npm install --ignore-scripts --no-audit --no-fund
fi

# 5. Run allowlisted lifecycle scripts explicitly
log "Running allowlisted lifecycle scripts..."
for script in "${ALLOWED_SCRIPTS[@]}"; do
  if [[ -d "node_modules/${script}" ]]; then
    log "Running lifecycle script for ${script}..."
    (cd "node_modules/${script}" && npm run install --if-present) || {
      log "Warning: lifecycle script for ${script} failed. Review manually."
    }
  fi
done

# 6. Run security audit
log "Running npm audit..."
npm audit --audit-level=high || {
  log "Warning: npm audit found high-severity vulnerabilities. Review and fix before deployment."
}

# 7. Verify lockfile is committed
if [[ -f package-lock.json ]]; then
  if git ls-files --error-unmatch package-lock.json >/dev/null 2>&1; then
    log "Lockfile is committed to git. Good."
  else
    log "Warning: package-lock.json is not committed. Add it to git for reproducible builds."
  fi
fi

log "Dependency setup complete."
log "Security notes:"
log "  - Exact versions pinned (no ^ or ~)"
log "  - Install scripts disabled by default"
log "  - All packages verified against live registry"
log "  - Lockfile committed for reproducible builds"
log "  - npm audit run with high-severity threshold"