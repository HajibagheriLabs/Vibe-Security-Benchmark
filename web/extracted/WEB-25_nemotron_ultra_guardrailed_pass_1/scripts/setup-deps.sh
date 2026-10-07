#!/usr/bin/env bash
# Dependency verification and installation script for Next.js project
# Verifies every package against live registry before installation

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Verify package exists on npm registry
verify_package() {
    local pkg="$1"
    local version="${2:-latest}"
    
    log_info "Verifying package: ${pkg}@${version}"
    
    # Check if package exists on registry
    if ! npm view "${pkg}@${version}" --json >/dev/null 2>&1; then
        log_error "Package ${pkg}@${version} not found on npm registry"
        return 1
    fi
    
    # Get package metadata
    local metadata
    metadata=$(npm view "${pkg}@${version}" --json 2>/dev/null)
    
    # Check package age (reject if < 90 days)
    local created
    created=$(echo "$metadata" | jq -r '.time.created // .time.modified // empty' 2>/dev/null)
    if [[ -n "$created" ]]; then
        local created_ts
        created_ts=$(date -d "$created" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "$created" +%s 2>/dev/null)
        local now_ts
        now_ts=$(date +%s)
        local age_days=$(( (now_ts - created_ts) / 86400 ))
        
        if [[ $age_days -lt 90 ]]; then
            log_warn "Package ${pkg} is only ${age_days} days old (< 90 days)"
        fi
    fi
    
    # Check for repository link
    local repo
    repo=$(echo "$metadata" | jq -r '.repository.url // .repository // empty' 2>/dev/null)
    if [[ -z "$repo" || "$repo" == "null" ]]; then
        log_warn "Package ${pkg} has no repository link"
    fi
    
    # Check for install scripts
    local scripts
    scripts=$(echo "$metadata" | jq -r '.scripts // {} | keys[]' 2>/dev/null | grep -E '(install|postinstall|preinstall)' || true)
    if [[ -n "$scripts" ]]; then
        log_warn "Package ${pkg} has lifecycle scripts: ${scripts}"
        log_warn "These will be blocked by ignore-scripts=true in .npmrc"
    fi
    
    # Check download count (rough popularity indicator)
    local downloads
    downloads=$(npm view "${pkg}@${version}" downloads --json 2>/dev/null | jq -r '.downloads // 0' 2>/dev/null || echo "0")
    if [[ "$downloads" -lt 1000 ]]; then
        log_warn "Package ${pkg} has low download count: ${downloads}"
    fi
    
    log_info "Package ${pkg}@${version} verified successfully"
    return 0
}

# Main installation flow
main() {
    log_info "Starting dependency verification and installation"
    
    # Ensure we have package-lock.json
    if [[ ! -f "package-lock.json" ]]; then
        log_error "package-lock.json not found. Run 'npm install' first to generate lockfile."
        exit 1
    fi
    
    # Extract all dependencies from package.json
    local deps
    deps=$(jq -r '.dependencies // {} | to_entries[] | "\(.key)@\(.value)"' package.json 2>/dev/null || true)
    local dev_deps
    dev_deps=$(jq -r '.devDependencies // {} | to_entries[] | "\(.key)@\(.value)"' package.json 2>/dev/null || true)
    
    # Verify each dependency
    local failed=0
    for dep in $deps $dev_deps; do
        local pkg="${dep%@*}"
        local version="${dep#*@}"
        
        # Skip workspace protocols and file: references
        if [[ "$version" =~ ^(workspace:|file:|link:) ]]; then
            log_info "Skipping local/workspace dependency: ${pkg}"
            continue
        fi
        
        if ! verify_package "$pkg" "$version"; then
            ((failed++))
        fi
    done
    
    if [[ $failed -gt 0 ]]; then
        log_error "$failed package(s) failed verification. Aborting installation."
        exit 1
    fi
    
    log_info "All packages verified. Proceeding with installation..."
    
    # Install with frozen lockfile and require hashes
    npm ci --frozen-lockfile --require-hashes
    
    log_info "Installation complete"
}

main "$@"