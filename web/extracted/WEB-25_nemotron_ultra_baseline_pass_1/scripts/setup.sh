#!/usr/bin/env bash
# Setup script for Next.js project dependency installation
# Usage: ./scripts/setup.sh [--ci] [--skip-build]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
CI_MODE=false
SKIP_BUILD=false

for arg in "$@"; do
  case $arg in
    --ci)
      CI_MODE=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown argument: $arg${NC}"
      exit 1
      ;;
  esac
done

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check Node.js version matches engines field in package.json
check_node_version() {
  log_info "Checking Node.js version..."
  
  if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
  fi
  
  local node_version
  node_version=$(node --version | sed 's/^v//')
  log_info "Found Node.js v${node_version}"
  
  if [[ -f package.json ]]; then
    local required_version
    required_version=$(node -e "
      const pkg = require('./package.json');
      console.log(pkg.engines?.node || '>=18.17.0');
    " 2>/dev/null || echo ">=18.17.0")
    
    log_info "Required: ${required_version}"
    
    # Simple semver check for major version
    local required_major
    required_major=$(echo "$required_version" | grep -oE '[0-9]+' | head -1)
    local current_major
    current_major=$(echo "$node_version" | cut -d. -f1)
    
    if [[ "$current_major" -lt "$required_major" ]]; then
      log_error "Node.js version mismatch. Required: ${required_version}, Found: v${node_version}"
      exit 1
    fi
  fi
}

# Check npm version
check_npm_version() {
  log_info "Checking npm version..."
  
  if ! command -v npm &> /dev/null; then
    log_error "npm is not installed"
    exit 1
  fi
  
  local npm_version
  npm_version=$(npm --version)
  log_info "Found npm v${npm_version}"
  
  # Require npm >= 9 for better workspace support and peer deps handling
  local npm_major
  npm_major=$(echo "$npm_version" | cut -d. -f1)
  
  if [[ "$npm_major" -lt 9 ]]; then
    log_warn "npm version < 9 detected. Consider upgrading for better peer dependency handling."
  fi
}

# Install dependencies
install_deps() {
  log_info "Installing dependencies..."
  
  if [[ "$CI_MODE" == "true" ]]; then
    # In CI, use ci command for faster, deterministic installs
    if [[ -f package-lock.json ]]; then
      log_info "Using npm ci for reproducible install..."
      npm ci --prefer-offline --no-audit --no-fund
    else
      log_warn "package-lock.json not found, falling back to npm install"
      npm install --prefer-offline --no-audit --no-fund
    fi
  else
    # Local development: regular install
    npm install --prefer-offline --no-audit --no-fund
  fi
}

# Verify installation
verify_install() {
  log_info "Verifying installation..."
  
  # Check if node_modules exists
  if [[ ! -d node_modules ]]; then
    log_error "node_modules directory not found after install"
    exit 1
  fi
  
  # Verify Next.js is installed
  if [[ ! -d node_modules/next ]]; then
    log_error "Next.js not found in node_modules"
    exit 1
  fi
  
  # Check for peer dependency issues
  log_info "Checking for peer dependency issues..."
  if npm ls 2>&1 | grep -q "peer dep missing"; then
    log_warn "Peer dependency issues detected. Run 'npm ls' for details."
  fi
  
  log_info "Installation verified successfully"
}

# Build the project (optional)
build_project() {
  if [[ "$SKIP_BUILD" == "true" ]]; then
    log_info "Skipping build (--skip-build flag provided)"
    return 0
  fi
  
  log_info "Building Next.js project..."
  
  if [[ "$CI_MODE" == "true" ]]; then
    npm run build --if-present
  else
    npm run build
  fi
}

# Main execution
main() {
  log_info "Starting Next.js project setup..."
  
  # Ensure we're in the project root
  if [[ ! -f package.json ]]; then
    log_error "package.json not found. Run this script from the project root."
    exit 1
  fi
  
  check_node_version
  check_npm_version
  install_deps
  verify_install
  build_project
  
  log_info "Setup completed successfully! 🚀"
  
  if [[ "$CI_MODE" != "true" ]]; then
    echo ""
    log_info "To start the development server:"
    echo "  npm run dev"
  fi
}

main "$@"