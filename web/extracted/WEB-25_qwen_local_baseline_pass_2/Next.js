# .npmrc
# Use legacy-peer-deps to avoid peer dependency conflicts common in Next.js projects
legacy-peer-deps=true

# Enable strict peer dependency checking for dev dependencies
strict-peer-dependencies=false

# Cache settings for faster subsequent installs
cache=/tmp/npm-cache
prefer-offline=true

# Use the latest stable Node.js engine range if specified in package.json
engine-strict=false