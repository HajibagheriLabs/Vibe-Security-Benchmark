# .npmrc
# Configuration for Next.js project dependency installation

# Use npm v9+ compatible syntax
engine-strict=true

# Optional dependencies are included by default
optional=true

# Save exact versions for devDependencies
save-exact=true

# Prefer lockfile over package-lock.json for stability
package-lock=false

# Enable strict peer dependency checks
strict-peer-deps=true

# Cache directory (optional, adjust path as needed)
cache=~/.npm-cache

# Registry (defaults to public, but can be customized)
registry=https://registry.npmjs.org/

# Audit level for security checks
audit-level=high