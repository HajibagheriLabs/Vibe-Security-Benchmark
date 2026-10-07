# Next.js project npm configuration

# Use exact versions for reproducible builds
save-exact=true

# Include optional dependencies (default behavior, but explicit)
include=optional

# Set package-lock.json to be generated and committed
package-lock=true

# Audit settings - fail on high severity vulnerabilities
audit=true
audit-level=high

# Registry configuration
registry=https://registry.npmjs.org/

# Cache configuration for CI environments
cache-min=10

# Fund display - disable noisy funding messages
fund=false

# Update notifier - disable in CI environments
update-notifier=false

# Legacy peer dependencies - Next.js 13+ requires this for some packages
legacy-peer-deps=false

# Strict SSL for security
strict-ssl=true

# Engine strict - enforce Node.js version requirements
engine-strict=true

# Scripts - allow lifecycle scripts for packages like sharp, esbuild
ignore-scripts=false

# Progress bar - disable in CI for cleaner logs
progress=false

# Log level
loglevel=warn

# Prefer offline - use cached packages when available
prefer-offline=true

# Fetch retries for flaky networks
fetch-retries=3
fetch-retry-maxtimeout=60000
fetch-retry-mintimeout=10000

# Timeout settings
fetch-timeout=300000

# Git tag versioning
git-tag-version=true

# Save prefix - no caret or tilde (redundant with save-exact, but explicit)
save-prefix=''

# Package-lock only - ensure lockfile is always updated
package-lock-only=false

# Workspace support (if monorepo)
workspaces=false

# Optional chaining support
optional=false

# Peer dependencies - auto-install peers
auto-install-peers=true

# Dedupe strategy
dedupe=true

# Install strategy
install-strategy=hoisted

# Global style
global-style=false

# Legacy bundling
legacy-bundling=false

# Dry run default
dry-run=false

# Force
force=false

# Color output
color=true

# Unicode
unicode=true

# Bin links
bin-links=true

# Shrinkwrap
shrinkwrap=true

# Package lock only
package-lock-only=false

# Save dev dependencies
save-dev=true

# Save optional dependencies
save-optional=true

# Save peer dependencies
save-peer=false

# Save prod dependencies
save-prod=true

# Tag
tag=latest

# Before
before=null

# Depth
depth=Infinity

# Global
global=false

# Global config
globalconfig=${HOME}/.npmrc

# User config
userconfig=${HOME}/.npmrc

# Cache
cache=${HOME}/.npm

# Tmp
tmp=${TMPDIR:-/tmp}

# Node options for memory
node-options=--max-old-space-size=4096

# Shell
script-shell=/bin/bash

# Umask
umask=0022

# Access
access=restricted

# Also
also=null

# Description
description=true

# Search opts
searchopts=

# Search limit
searchlimit=20

# Searchexclude
searchexclude=

# Searchstaleness
searchstaleness=900

# Registry
@next:registry=https://registry.npmjs.org/
@react:registry=https://registry.npmjs.org/
@types:registry=https://registry.npmjs.org/

# Scoped registry for private packages (if applicable)
# @your-scope:registry=https://npm.pkg.github.com/
# //npm.pkg.github.com/:_authToken=${NPM_TOKEN}