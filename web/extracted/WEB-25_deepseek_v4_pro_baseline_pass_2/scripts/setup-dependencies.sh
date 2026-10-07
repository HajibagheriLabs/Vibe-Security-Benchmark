#!/usr/bin/env bash
#
# setup-dependencies.sh
# Setup script for Next.js project dependency installation
# Ensures correct Node.js version, installs dependencies, and validates the setup
#

set -euo pipefail
IFS=$'\n\t'

# ─── Configuration ───────────────────────────────────────────────────────────

# Required Node.js version (from .nvmrc or package.json engines)
REQUIRED_NODE_VERSION="${REQUIRED_NODE_VERSION:-20}"

# Package manager to use
PACKAGE_MANAGER="${PACKAGE_MANAGER:-npm}"

# Install command
INSTALL_COMMAND="${INSTALL_COMMAND:-ci}"

# Log file
LOG_FILE="${LOG_FILE:-./logs/dependency-install.log}"

# ─── Color Output ────────────────────────────────────────────────────────────

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# ─── Helper Functions ────────────────────────────────────────────────────────

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE" >&2
}

# ─── Pre-flight Checks ───────────────────────────────────────────────────────

check_node_version() {
    log_info "Checking Node.js version..."

    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js v${REQUIRED_NODE_VERSION} or higher."
        exit 1
    fi

    local node_version
    node_version=$(node -v | sed 's/v//' | cut -d'.' -f1)

    if [[ "${node_version}" -lt "${REQUIRED_NODE_VERSION%%.*}" ]]; then
        log_error "Node.js version $(node -v) is too old. Required: v${REQUIRED_NODE_VERSION} or higher."
        exit 1
    fi

    log_success "Node.js version $(node -v) is compatible."
}

check_npm_version() {
    log_info "Checking npm version..."

    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed."
        exit 1
    fi

    local npm_version
    npm_version=$(npm -v)

    log_success "npm version ${npm_version} found."
}

check_package_json() {
    log_info "Checking package.json..."

    if [[ ! -f "package.json" ]]; then
        log_error "package.json not found in current directory."
        exit 1
    fi

    log_success "package.json found."
}

check_lockfile() {
    log_info "Checking for lockfile..."

    if [[ -f "package-lock.json" ]]; then
        log_success "package-lock.json found. Using 'npm ci' for reproducible install."
        INSTALL_COMMAND="ci"
    elif [[ -f "npm-shrinkwrap.json" ]]; then
        log_success "npm-shrinkwrap.json found. Using 'npm ci' for reproducible install."
        INSTALL_COMMAND="ci"
    elif [[ -f "yarn.lock" ]]; then
        log_warning "yarn.lock found but npm is configured. Consider using yarn or remove yarn.lock."
        INSTALL_COMMAND="install"
    elif [[ -f "pnpm-lock.yaml" ]]; then
        log_warning "pnpm-lock.yaml found but npm is configured. Consider using pnpm or remove pnpm-lock.yaml."
        INSTALL_COMMAND="install"
    else
        log_warning "No lockfile found. Running 'npm install' to generate one."
        INSTALL_COMMAND="install"
    fi
}

check_disk_space() {
    log_info "Checking available disk space..."

    local available_space
    available_space=$(df -k . | awk 'NR==2 {print $4}')

    if [[ "${available_space}" -lt 1048576 ]]; then  # 1 GB in KB
        log_warning "Less than 1 GB of disk space available (${available_space} KB)."
    else
        log_success "Sufficient disk space available ($((available_space / 1024)) MB)."
    fi
}

check_network() {
    log_info "Checking network connectivity to npm registry..."

    if curl -s --max-time 5 "https://registry.npmjs.org/" > /dev/null 2>&1; then
        log_success "npm registry is reachable."
    else
        log_warning "Cannot reach npm registry. Will attempt offline install if cache is available."
    fi
}

# ─── Cleanup Functions ───────────────────────────────────────────────────────

clean_node_modules() {
    if [[ -d "node_modules" ]]; then
        log_info "Removing existing node_modules directory..."
        rm -rf node_modules
        log_success "node_modules removed."
    fi
}

clean_npm_cache() {
    if [[ "${CLEAN_CACHE:-false}" == "true" ]]; then
        log_info "Cleaning npm cache..."
        npm cache clean --force
        log_success "npm cache cleaned."
    fi
}

# ─── Installation Functions ──────────────────────────────────────────────────

install_dependencies() {
    log_info "Installing dependencies using 'npm ${INSTALL_COMMAND}'..."

    local install_output
    local install_exit_code

    # Run the install command
    if [[ "${INSTALL_COMMAND}" == "ci" ]]; then
        install_output=$(npm ci --no-audit --no-fund 2>&1)
        install_exit_code=$?
    else
        install_output=$(npm install --no-audit --no-fund 2>&1)
        install_exit_code=$?
    fi

    echo "$install_output" | tee -a "$LOG_FILE"

    if [[ ${install_exit_code} -ne 0 ]]; then
        log_error "Dependency installation failed with exit code ${install_exit_code}."
        return 1
    fi

    log_success "Dependencies installed successfully."
    return 0
}

install_dev_dependencies() {
    if [[ "${INSTALL_DEV_DEPS:-true}" == "true" ]]; then
        log_info "Dev dependencies are included in the install."
    else
        log_info "Skipping dev dependencies (NODE_ENV=production)."
        export NODE_ENV=production
        npm prune --production
    fi
}

run_postinstall_scripts() {
    log_info "Running post-install validation..."

    # Check if Next.js is installed
    if [[ -d "node_modules/next" ]]; then
        local next_version
        next_version=$(node -e "console.log(require('next/package.json').version)" 2>/dev/null || echo "unknown")
        log_success "Next.js version ${next_version} installed."
    else
        log_warning "Next.js not found in node_modules. Check your package.json dependencies."
    fi

    # Check if React is installed
    if [[ -d "node_modules/react" ]]; then
        local react_version
        react_version=$(node -e "console.log(require('react/package.json').version)" 2>/dev/null || echo "unknown")
        log_success "React version ${react_version} installed."
    else
        log_warning "React not found in node_modules. Check your package.json dependencies."
    fi
}

verify_installation() {
    log_info "Verifying installation..."

    # Check node_modules exists and is not empty
    if [[ ! -d "node_modules" ]] || [[ -z "$(ls -A node_modules 2>/dev/null)" ]]; then
        log_error "node_modules directory is missing or empty."
        return 1
    fi

    # Check for common Next.js binaries
    if [[ -f "node_modules/.bin/next" ]]; then
        log_success "Next.js binary found."
    else
        log_warning "Next.js binary not found in node_modules/.bin/."
    fi

    # Check package-lock.json was created/updated
    if [[ -f "package-lock.json" ]]; then
        log_success "package-lock.json is present."
    else
        log_warning "package-lock.json was not generated. Run 'npm install' to create it."
    fi

    return 0
}

# ─── Main Execution ──────────────────────────────────────────────────────────

main() {
    # Create logs directory
    mkdir -p "$(dirname "$LOG_FILE")"

    # Initialize log file
    : > "$LOG_FILE"

    log_info "=== Next.js Dependency Setup Started ==="
    log_info "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    log_info "Working directory: $(pwd)"
    log_info "Package manager: ${PACKAGE_MANAGER}"
    log_info "Install command: ${INSTALL_COMMAND}"

    # Run pre-flight checks
    check_node_version
    check_npm_version
    check_package_json
    check_lockfile
    check_disk_space
    check_network

    # Clean up if requested
    if [[ "${CLEAN_INSTALL:-false}" == "true" ]]; then
        clean_node_modules
        clean_npm_cache
    fi

    # Install dependencies
    if ! install_dependencies; then
        log_error "Dependency installation failed. Check the log file at ${LOG_FILE}"
        exit 1
    fi

    # Handle dev dependencies
    install_dev_dependencies

    # Run post-install scripts
    run_postinstall_scripts

    # Verify installation
    if ! verify_installation; then
        log_error "Installation verification failed."
        exit 1
    fi

    log_success "=== Next.js Dependency Setup Completed Successfully ==="
    log_info "Total time: ${SECONDS} seconds"
}

# ─── Script Entry Point ──────────────────────────────────────────────────────

# Allow sourcing without executing
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi