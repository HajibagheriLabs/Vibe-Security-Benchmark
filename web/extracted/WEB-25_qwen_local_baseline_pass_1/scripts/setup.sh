#!/usr/bin/env bash
#
# setup.sh
# Setup script for Next.js project dependency installation
#
# Usage:
#   ./scripts/setup.sh [--clean] [--verbose]
#
# Options:
#   --clean    Remove node_modules before installation
#   --verbose  Enable verbose logging for npm commands

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse arguments
CLEAN=false
VERBOSE=false

for arg in "$@"; do
    case $arg in
        --clean)
            CLEAN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            log_error "Unknown argument: $arg"
            exit 1
            ;;
    esac
done

# Determine npm flags
NPM_FLAGS="--no-audit"
if [ "$VERBOSE" = true ]; then
    NPM_FLAGS="$NPM_FLAGS --loglevel=verbose"
fi

# Check for required tools
check_requirements() {
    log_info "Checking required tools..."

    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js >= 18.x"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm"
        exit 1
    fi

    NODE_VERSION=$(node --version | sed 's/v//')
    NPM_VERSION=$(npm --version)

    log_info "Node.js version: $NODE_VERSION"
    log_info "npm version: $NPM_VERSION"

    # Check Node.js version (Next.js requires Node.js >= 18.17.0 for most features)
    MAJOR_VERSION=$(echo "$NODE_VERSION" | cut -d. -f1)
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        log_warn "Node.js version $NODE_VERSION is less than 18.x. Some features may not work correctly."
    fi
}

# Clean node_modules if requested
clean_node_modules() {
    if [ "$CLEAN" = true ]; then
        log_info "Removing node_modules..."
        rm -rf node_modules
        rm -f package-lock.json
        log_info "Cleaned node_modules and package-lock.json"
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    if npm install $NPM_FLAGS; then
        log_info "Dependencies installed successfully"
    else
        log_error "Failed to install dependencies"
        exit 1
    fi
}

# Verify installation
verify_installation() {
    log_info "Verifying installation..."
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        log_error "node_modules directory not found after installation"
        exit 1
    fi

    # Check for critical packages
    CRITICAL_PACKAGES=("next" "react" "react-dom")
    for pkg in "${CRITICAL_PACKAGES[@]}"; do
        if ! npm list "$pkg" --depth=0 &> /dev/null; then
            log_warn "Package $pkg not found in node_modules"
        else
            log_info "Package $pkg is installed"
        fi
    done

    log_info "Verification complete"
}

# Main execution
main() {
    log_info "Starting Next.js project setup..."
    
    check_requirements
    clean_node_modules
    install_dependencies
    verify_installation
    
    log_info "Setup complete! You can now run 'npm run dev' to start the development server."
}

main "$@"