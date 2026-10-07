#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Next.js Project Dependency Setup Script
# Ensures correct Node/npm versions, installs dependencies,
# and verifies the installation.
# ============================================================

# --- Configuration ------------------------------------------
REQUIRED_NODE_MAJOR=18
REQUIRED_NPM_MAJOR=9
LOCKFILE="package-lock.json"
NODE_MODULES="node_modules"

# --- Colors for output --------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# --- Helper functions ----------------------------------------
check_node_version() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed."
        exit 1
    fi

    local node_version
    node_version=$(node -v | sed 's/^v//')
    local node_major
    node_major=$(echo "$node_version" | cut -d. -f1)

    if [ "$node_major" -lt "$REQUIRED_NODE_MAJOR" ]; then
        log_error "Node.js version $REQUIRED_NODE_MAJOR or higher is required (found v$node_version)."
        exit 1
    fi

    log_info "Node.js version: v$node_version"
}

check_npm_version() {
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed."
        exit 1
    fi

    local npm_version
    npm_version=$(npm -v)
    local npm_major
    npm_major=$(echo "$npm_version" | cut -d. -f1)

    if [ "$npm_major" -lt "$REQUIRED_NPM_MAJOR" ]; then
        log_error "npm version $REQUIRED_NPM_MAJOR or higher is required (found v$npm_version)."
        exit 1
    fi

    log_info "npm version: v$npm_version"
}

clean_install() {
    log_warn "Removing existing node_modules and lockfile for a clean install..."
    rm -rf "$NODE_MODULES" "$LOCKFILE"
}

install_dependencies() {
    log_info "Installing dependencies..."

    if [ -f "$LOCKFILE" ]; then
        log_info "Lockfile found. Running 'npm ci' for reproducible install..."
        npm ci
    else
        log_info "No lockfile found. Running 'npm install'..."
        npm install
    fi
}

verify_installation() {
    log_info "Verifying installation..."

    if [ ! -d "$NODE_MODULES" ]; then
        log_error "node_modules directory not found after installation."
        exit 1
    fi

    if [ ! -f "$LOCKFILE" ]; then
        log_error "package-lock.json not generated after installation."
        exit 1
    fi

    log_info "Dependency installation verified successfully."
}

run_audit() {
    log_info "Running security audit..."
    npm audit --audit-level=high || log_warn "Security audit found vulnerabilities. Review with 'npm audit'."
}

# --- Main execution ------------------------------------------
main() {
    local clean_flag=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --clean)
                clean_flag=true
                shift
                ;;
            --skip-audit)
                SKIP_AUDIT=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [--clean] [--skip-audit]"
                echo ""
                echo "Options:"
                echo "  --clean       Remove node_modules and lockfile before install"
                echo "  --skip-audit  Skip the npm audit step"
                echo "  -h, --help    Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    log_info "Starting dependency setup..."

    # Version checks
    check_node_version
    check_npm_version

    # Clean install if requested
    if [ "$clean_flag" = true ]; then
        clean_install
    fi

    # Install dependencies
    install_dependencies

    # Verify installation
    verify_installation

    # Security audit (unless skipped)
    if [ "${SKIP_AUDIT:-false}" != "true" ]; then
        run_audit
    fi

    log_info "Dependency setup completed successfully."
}

# Run main function
main "$@"