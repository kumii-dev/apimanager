#!/bin/bash

# ============================================================
# KUMII API Gateway - Development Server Startup
# Starts both Gateway Server and Admin Client concurrently
# ============================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           🚀 KUMII API Gateway - Dev Server Startup           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================
# Pre-flight Checks
# ============================================================

echo -e "${BLUE}📋 Running pre-flight checks...${NC}"

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo -e "${YELLOW}Please install Node.js 18 or higher${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18 or higher is required${NC}"
    echo -e "${YELLOW}Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v)${NC}"

# Check if .env files exist
if [ ! -f "$SCRIPT_DIR/gateway-server/.env" ]; then
    echo -e "${RED}❌ Gateway server .env file not found${NC}"
    echo -e "${YELLOW}Please create gateway-server/.env from .env.example${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Gateway .env file exists${NC}"

if [ ! -f "$SCRIPT_DIR/admin-client/.env" ]; then
    echo -e "${RED}❌ Admin client .env file not found${NC}"
    echo -e "${YELLOW}Please create admin-client/.env from .env.example${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Admin client .env file exists${NC}"

# Check if dependencies are installed
if [ ! -d "$SCRIPT_DIR/gateway-server/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Gateway server dependencies not installed${NC}"
    echo -e "${BLUE}Installing gateway-server dependencies...${NC}"
    cd "$SCRIPT_DIR/gateway-server"
    npm install
    cd "$SCRIPT_DIR"
fi
echo -e "${GREEN}✅ Gateway dependencies installed${NC}"

if [ ! -d "$SCRIPT_DIR/admin-client/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Admin client dependencies not installed${NC}"
    echo -e "${BLUE}Installing admin-client dependencies...${NC}"
    cd "$SCRIPT_DIR/admin-client"
    npm install
    cd "$SCRIPT_DIR"
fi
echo -e "${GREEN}✅ Admin client dependencies installed${NC}"

echo ""
echo -e "${GREEN}✅ All pre-flight checks passed!${NC}"
echo ""

# ============================================================
# Start Servers
# ============================================================

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    🎬 Starting Services                        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🔹 Gateway Server:${NC} http://localhost:3000"
echo -e "${MAGENTA}🔹 Admin Client:${NC}   http://localhost:5173"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}⚠️  Shutting down services...${NC}"
    pkill -P $$ || true
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup SIGINT SIGTERM

# Check if we have concurrently installed
if [ -f "$SCRIPT_DIR/node_modules/.bin/concurrently" ]; then
    # Use concurrently if available (better output formatting)
    echo -e "${BLUE}Using concurrently for parallel execution...${NC}"
    echo ""
    npm run dev
else
    # Fallback to manual process management
    echo -e "${BLUE}Starting services manually...${NC}"
    echo ""
    
    # Start gateway server in background
    cd "$SCRIPT_DIR/gateway-server"
    (
        echo -e "${BLUE}[GATEWAY]${NC} Starting gateway server..."
        npm run dev 2>&1 | while IFS= read -r line; do
            echo -e "${BLUE}[GATEWAY]${NC} $line"
        done
    ) &
    GATEWAY_PID=$!
    
    # Wait a bit for gateway to start
    sleep 2
    
    # Start admin client in background
    cd "$SCRIPT_DIR/admin-client"
    (
        echo -e "${MAGENTA}[ADMIN]${NC} Starting admin client..."
        npm run dev 2>&1 | while IFS= read -r line; do
            echo -e "${MAGENTA}[ADMIN]${NC} $line"
        done
    ) &
    ADMIN_PID=$!
    
    # Wait for both processes
    wait $GATEWAY_PID $ADMIN_PID
fi
