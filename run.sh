#!/usr/bin/env bash

# =============================================================================
# PharmaVigil Backend — Run Script
# Starts the Hono Node.js backend server with optional lint, test, format, and seed passes.
# =============================================================================

set -e

# ---------------------------------------------------------------------------
# Colors & Formatting
# ---------------------------------------------------------------------------
MAGENTA=$'\033[0;35m'
GREEN=$'\033[0;32m'
CYAN=$'\033[0;36m'
YELLOW=$'\033[0;33m'
RED=$'\033[0;31m'
NC=$'\033[0m'
BOLD=$'\033[1m'

PREFIX="${MAGENTA}[backend]${NC}"
PKG_MANAGER="npm"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

LINT=0
TEST=0
PRETTIFY=0
TYPECHECK=0
SEED=0

# ---------------------------------------------------------------------------
# Argument Parsing
# ---------------------------------------------------------------------------
usage() {
    cat << EOF
${BOLD}PharmaVigil Backend Service Runner${NC}

${BOLD}Usage:${NC} $0 [options]

${BOLD}Options:${NC}
  -l, --lint       Run ESLint check before starting the server
  -t, --test       Run Vitest suite before starting the server
  -c, --check      Run TypeScript typecheck (tsc --noEmit)
  -p, --prettify   Run Prettier code formatting
  -s, --seed       Seed MongoDB Atlas with clinical rules & identity fixtures
  -h, --help       Show this help message

${BOLD}Default Action:${NC}
  Starts the backend dev server via 'npm run dev' on http://localhost:8787
EOF
    exit 0
}

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -l|--lint)     LINT=1 ;;
        -t|--test)     TEST=1 ;;
        -c|--check)    TYPECHECK=1 ;;
        -p|--prettify) PRETTIFY=1 ;;
        -s|--seed)     SEED=1 ;;
        -h|--help)     usage ;;
        *)
            echo -e "${RED}Unknown parameter: $1${NC}"
            echo "Use -h or --help for usage."
            exit 1
            ;;
    esac
    shift
done

# ---------------------------------------------------------------------------
# Pre-run Phases (Sequential)
# ---------------------------------------------------------------------------
if [[ $PRETTIFY -eq 1 ]]; then
    echo -e "${YELLOW}==> Running Prettier formatting (backend)...${NC}"
    $PKG_MANAGER run format
    echo -e "${GREEN}✔ Prettier formatting completed.${NC}\n"
fi

if [[ $LINT -eq 1 ]]; then
    echo -e "${YELLOW}==> Running linter (backend)...${NC}"
    $PKG_MANAGER run lint
    echo -e "${GREEN}✔ Linting passed.${NC}\n"
fi

if [[ $TYPECHECK -eq 1 ]]; then
    echo -e "${YELLOW}==> Running TypeScript typecheck (backend)...${NC}"
    $PKG_MANAGER run typecheck
    echo -e "${GREEN}✔ Typecheck passed.${NC}\n"
fi

if [[ $TEST -eq 1 ]]; then
    echo -e "${YELLOW}==> Running tests (backend)...${NC}"
    $PKG_MANAGER test
    echo -e "${GREEN}✔ All backend tests passed.${NC}\n"
fi

if [[ $SEED -eq 1 ]]; then
    echo -e "${YELLOW}==> Seeding MongoDB Atlas fixtures...${NC}"
    $PKG_MANAGER run seed
    echo -e "${GREEN}✔ Seed completed.${NC}\n"
fi

# ---------------------------------------------------------------------------
# Server Execution
# ---------------------------------------------------------------------------
echo -e "${MAGENTA}${BOLD}==> Starting PharmaVigil Backend API on http://localhost:8787${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop server${NC}\n"

PID=""

cleanup() {
    if [[ -n "$PID" ]]; then
        echo -e "\n${YELLOW}==> Shutting down backend server...${NC}"
        kill "$PID" 2>/dev/null || true
        wait "$PID" 2>/dev/null || true
        echo -e "${GREEN}==> Backend stopped.${NC}"
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

FORCE_COLOR=1 $PKG_MANAGER run dev 2>&1 | while IFS= read -r line || [[ -n "$line" ]]; do
    printf "%s %s\n" "$PREFIX" "$line"
done &

PID=$!
wait "$PID"
