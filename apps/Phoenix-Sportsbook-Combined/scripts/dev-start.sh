#!/bin/bash

###############################################################################
# Phoenix Sportsbook Development Start Script
# Starts all services needed for local development
#
# Usage:
#   ./scripts/dev-start.sh          # Full stack (Docker + frontends)
#   ./scripts/dev-start.sh --local  # Go services locally (no Docker)
#   ./scripts/dev-start.sh --fe     # Frontends only (assumes backend running)
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLAYER_APP_DIR="${ROOT_DIR}/phoenix-frontend/packages/app"
BACKOFFICE_DIR="${ROOT_DIR}/talon-backoffice/packages/office"
GO_PLATFORM="${ROOT_DIR}/go-platform"

# PIDs to track for cleanup
PIDS=""

###############################################################################
# Utility Functions
###############################################################################

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
  if ! command -v "$1" &> /dev/null; then
    log_error "$1 is not installed or not in PATH"
    return 1
  fi
  return 0
}

wait_for_service() {
  local host=$1
  local port=$2
  local name=$3
  local max_attempts=30
  local attempt=0

  while [ $attempt -lt $max_attempts ]; do
    if curl -s -o /dev/null -w '' "http://${host}:${port}/" 2>/dev/null; then
      log_success "${name} ready at ${host}:${port}"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done

  log_warn "${name} at ${host}:${port} not responding after ${max_attempts}s"
  return 1
}

###############################################################################
# Prerequisites Check
###############################################################################

check_prerequisites() {
  log_info "Checking prerequisites..."

  local ok=1

  check_command "node" || ok=0

  if ! check_command "yarn"; then
    if check_command "npm"; then
      log_warn "yarn not found, will use npm"
    else
      log_error "yarn or npm is required"
      ok=0
    fi
  fi

  if [ "$MODE" = "docker" ]; then
    if ! check_command "docker"; then
      log_error "Docker is required for --docker mode"
      ok=0
    fi
  fi

  if [ "$MODE" = "local" ]; then
    if ! check_command "go"; then
      log_error "Go is required for --local mode"
      ok=0
    fi
  fi

  if [ $ok -eq 0 ]; then
    log_error "Please install missing prerequisites and try again"
    exit 1
  fi

  log_success "Prerequisites OK"
}

###############################################################################
# Build Workspace Packages
###############################################################################

build_workspace_packages() {
  log_info "Building workspace packages..."

  # Talon Backoffice
  for pkg in utils api-client design-system; do
    local pkg_dir="${ROOT_DIR}/talon-backoffice/packages/${pkg}"
    if [ ! -f "${pkg_dir}/dist/index.js" ]; then
      log_info "  Building talon-backoffice/${pkg}..."
      cd "${pkg_dir}"
      npx tsc --outDir dist --declaration 2>/dev/null || log_warn "  ${pkg} had type errors (non-blocking)"
    fi
  done

  # Phoenix Frontend
  for pkg in utils api-client design-system; do
    local pkg_dir="${ROOT_DIR}/phoenix-frontend/packages/${pkg}"
    if [ ! -f "${pkg_dir}/dist/index.js" ]; then
      log_info "  Building phoenix-frontend/${pkg}..."
      cd "${pkg_dir}"
      npx tsc --outDir dist --declaration 2>/dev/null || log_warn "  ${pkg} had type errors (non-blocking)"
    fi
  done

  log_success "Workspace packages built"
}

###############################################################################
# Docker Services
###############################################################################

start_docker_services() {
  log_info "Starting Docker services (PostgreSQL, Redis, Gateway, Auth)..."

  cd "$ROOT_DIR"

  if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
  elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
  else
    log_error "Docker Compose not found"
    exit 1
  fi

  $COMPOSE_CMD up -d

  log_success "Docker services started"
  wait_for_service localhost 18080 "Gateway" || true
  wait_for_service localhost 18081 "Auth" || true
}

###############################################################################
# Local Go Services (no Docker)
###############################################################################

start_local_go_services() {
  log_info "Building Go services..."

  cd "$GO_PLATFORM"

  go build -o /tmp/phoenix-gateway ./services/gateway/cmd/gateway
  log_success "Gateway built"

  go build -o /tmp/phoenix-auth ./services/auth/cmd/auth
  log_success "Auth built"

  log_info "Starting Go services..."

  /tmp/phoenix-gateway > /tmp/gateway.log 2>&1 &
  GATEWAY_PID=$!
  PIDS="$PIDS $GATEWAY_PID"
  log_success "Gateway started (PID: $GATEWAY_PID)"

  /tmp/phoenix-auth > /tmp/auth.log 2>&1 &
  AUTH_PID=$!
  PIDS="$PIDS $AUTH_PID"
  log_success "Auth started (PID: $AUTH_PID)"

  sleep 2
  wait_for_service localhost 18080 "Gateway" || true
  wait_for_service localhost 18081 "Auth" || true
}

###############################################################################
# Frontend Apps
###############################################################################

# Remove pages/ files that conflict with app/ router.
# Next.js 13.5 Pages Router takes priority over App Router for the same route,
# so if pages/index.tsx exists (even as an empty module), the App Router's
# app/page.tsx never runs. Deleting these stubs lets the App Router serve them.
cleanup_router_conflicts() {
  log_info "Cleaning up Pages/App Router conflicts..."

  # phoenix-frontend conflicts
  local fe_pages="$ROOT_DIR/phoenix-frontend/packages/app/pages"
  rm -f "$fe_pages/index.tsx" 2>/dev/null
  rm -f "$fe_pages/cashier/index.tsx" 2>/dev/null
  rm -f "$fe_pages/profile/index.tsx" 2>/dev/null

  # talon-backoffice conflicts
  local bo_pages="$ROOT_DIR/talon-backoffice/packages/office/pages"
  rm -f "$bo_pages/risk-management/index.tsx" 2>/dev/null
  rm -f "$bo_pages/risk-management/fixtures/index.tsx" 2>/dev/null
  rm -f "$bo_pages/risk-management/fixtures/[id].tsx" 2>/dev/null
  rm -f "$bo_pages/risk-management/markets/[id].tsx" 2>/dev/null
  rm -f "$bo_pages/users/index.tsx" 2>/dev/null
  rm -f "$bo_pages/users/[id].tsx" 2>/dev/null
  rm -f "$bo_pages/auth/index.tsx" 2>/dev/null

  log_success "Router conflicts cleaned"
}

install_if_needed() {
  local dir=$1
  local name=$2

  cd "$dir"

  # Check if root node_modules exists (for monorepo hoisting)
  local root_nm="$(dirname "$(dirname "$dir")")/node_modules"
  if [ ! -d "$root_nm/next" ]; then
    log_info "Installing ${name} dependencies..."
    cd "$(dirname "$(dirname "$dir")")"

    # Move corrupted yarn.lock out of the way — many entries have
    # missing version/resolved/integrity which causes yarn to fail
    # with "invalid package version undefined".
    if [ -f yarn.lock ]; then
      log_warn "Moving yarn.lock → yarn.lock.bak (will regenerate)"
      mv yarn.lock yarn.lock.bak 2>/dev/null || true
    fi

    local install_ok=0
    if command -v yarn &> /dev/null; then
      if yarn install; then
        install_ok=1
      else
        log_warn "yarn install failed, trying with --ignore-engines..."
        if yarn install --ignore-engines; then
          install_ok=1
        fi
      fi
    fi

    # Fallback to npm if yarn failed or isn't installed
    if [ $install_ok -eq 0 ]; then
      log_info "Falling back to npm install..."
      npm install --legacy-peer-deps || npm install || true
    fi

    cd "$dir"
  fi
}

start_player_app() {
  log_info "Starting Player App on port 3002..."

  install_if_needed "$PLAYER_APP_DIR" "Player App"
  cd "$PLAYER_APP_DIR"

  # next binary is hoisted to monorepo root node_modules/.bin/
  local monorepo_root="$(dirname "$(dirname "$PLAYER_APP_DIR")")"
  local next_bin="$monorepo_root/node_modules/.bin/next"
  if [ ! -x "$next_bin" ]; then
    log_info "Installing Player App dependencies..."
    cd "$monorepo_root"
    # Move corrupted yarn.lock if present
    if [ -f yarn.lock ]; then
      mv yarn.lock yarn.lock.bak 2>/dev/null || true
    fi
    yarn install || npm install --legacy-peer-deps || true
    cd "$PLAYER_APP_DIR"
  fi
  if [ ! -x "$next_bin" ]; then
    log_error "next still not found after install — check $monorepo_root/node_modules/.bin/"
    return 1
  fi

  NEXT_PUBLIC_API_URL=http://localhost:18080 \
  NEXT_PUBLIC_AUTH_URL=http://localhost:18081 \
  NEXT_PUBLIC_WS_URL=ws://localhost:18080/ws \
  PORT=3002 "$next_bin" dev -p 3002 &

  PLAYER_PID=$!
  PIDS="$PIDS $PLAYER_PID"
  log_success "Player App starting (PID: $PLAYER_PID)"
}

start_backoffice_app() {
  log_info "Starting Backoffice App on port 3001..."

  install_if_needed "$BACKOFFICE_DIR" "Backoffice"
  cd "$BACKOFFICE_DIR"

  # next binary is hoisted to monorepo root node_modules/.bin/
  local monorepo_root="$(dirname "$(dirname "$BACKOFFICE_DIR")")"
  local next_bin="$monorepo_root/node_modules/.bin/next"
  if [ ! -x "$next_bin" ]; then
    log_info "Installing Backoffice dependencies..."
    cd "$monorepo_root"
    # Move corrupted yarn.lock if present
    if [ -f yarn.lock ]; then
      mv yarn.lock yarn.lock.bak 2>/dev/null || true
    fi
    yarn install || npm install --legacy-peer-deps || true
    cd "$BACKOFFICE_DIR"
  fi
  if [ ! -x "$next_bin" ]; then
    log_error "next still not found after install — check $monorepo_root/node_modules/.bin/"
    return 1
  fi

  NEXT_PUBLIC_API_URL=http://localhost:18080 \
  NEXT_PUBLIC_AUTH_URL=http://localhost:18081 \
  NEXT_PUBLIC_WS_URL=ws://localhost:18080/ws \
  PORT=3001 "$next_bin" dev -p 3001 &

  BACKOFFICE_PID=$!
  PIDS="$PIDS $BACKOFFICE_PID"
  log_success "Backoffice starting (PID: $BACKOFFICE_PID)"
}

###############################################################################
# Display Summary
###############################################################################

display_summary() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  Phoenix Sportsbook Development Environment Started${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
  echo "  Backend:"
  echo -e "    ${GREEN}●${NC} API Gateway   → ${BLUE}http://localhost:18080${NC}"
  echo -e "    ${GREEN}●${NC} Auth Service  → ${BLUE}http://localhost:18081${NC}"
  echo -e "    ${GREEN}●${NC} WebSocket     → ${BLUE}ws://localhost:18080/ws${NC}"
  echo ""
  echo "  Frontend:"
  echo -e "    ${GREEN}●${NC} Backoffice    → ${BLUE}http://localhost:3001${NC}"
  echo -e "    ${GREEN}●${NC} Player App    → ${BLUE}http://localhost:3002${NC}"
  echo ""
  echo "  API Endpoints:"
  echo "    GET  /api/v1/fixtures          List fixtures with markets & odds"
  echo "    GET  /api/v1/sports            Sports catalog"
  echo "    POST /api/v1/bets              Place a bet"
  echo "    GET  /api/v1/bets/history      Bet history"
  echo "    POST /api/v1/auth/login        Login"
  echo "    POST /api/v1/auth/register     Register"
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop all services"
  echo ""
}

###############################################################################
# Cleanup on Exit
###############################################################################

cleanup() {
  echo ""
  log_info "Shutting down..."
  for pid in $PIDS; do
    kill "$pid" 2>/dev/null || true
  done
  # Also kill any next dev processes we spawned
  pkill -P $$ 2>/dev/null || true
  log_success "All services stopped"
}

trap cleanup EXIT INT TERM

###############################################################################
# Main
###############################################################################

MODE="docker"
SKIP_FE=0
SKIP_BE=0

for arg in "$@"; do
  case $arg in
    --local)  MODE="local" ;;
    --fe)     SKIP_BE=1 ;;
    --be)     SKIP_FE=1 ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --local   Run Go services locally (no Docker)"
      echo "  --fe      Start frontends only (assumes backend running)"
      echo "  --be      Start backend only (no frontends)"
      echo "  --help    Show this help"
      exit 0
      ;;
  esac
done

main() {
  log_info "Starting Phoenix Sportsbook (mode: ${MODE})"
  log_info "Root: ${ROOT_DIR}"
  echo ""

  check_prerequisites

  # Backend
  if [ $SKIP_BE -eq 0 ]; then
    if [ "$MODE" = "docker" ]; then
      start_docker_services
    else
      start_local_go_services
    fi
  fi

  # Frontend
  if [ $SKIP_FE -eq 0 ]; then
    build_workspace_packages
    cleanup_router_conflicts
    start_backoffice_app
    start_player_app
  fi

  display_summary

  # Keep script running
  wait
}

main
