#!/bin/bash

# zrok deployment script for exp-track
# Exposes frontend and backend via zrok reserved shares

set -e

FRONTEND_NAME="hwdtmg"
BACKEND_NAME="apihoneywheredidthemoneygo"
FRONTEND_PORT=5173
BACKEND_PORT=3000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== exp-track zrok deployment ===${NC}"

# Check if zrok is installed
if ! command -v zrok &> /dev/null; then
    echo -e "${RED}Error: zrok is not installed${NC}"
    echo "Install with: brew install zrok"
    exit 1
fi

# Check if zrok is enabled
if ! zrok status &> /dev/null; then
    echo -e "${RED}Error: zrok is not enabled${NC}"
    echo "Run: zrok enable $ZROK_TOKEN"
    echo "Get your token from: https://zrok.io"
    exit 1
fi

# Function to reserve a share if it doesn't exist
reserve_if_needed() {
    local name=$1
    local port=$2

    # Check if reservation exists by trying to list it
    if zrok overview 2>/dev/null | grep -q "$name"; then
        echo -e "${YELLOW}Reservation '$name' already exists${NC}"
    else
        echo -e "${GREEN}Creating reservation '$name' for port $port...${NC}"
        zrok reserve public localhost:$port --unique-name "$name"
    fi
}

# Function to start a share in background
start_share() {
    local name=$1
    local port=$2
    local label=$3

    echo -e "${GREEN}Starting $label share...${NC}"
    zrok share reserved "$name" --headless &
    echo $! > "/tmp/zrok-$name.pid"
    echo -e "${GREEN}$label: https://$name.share.zrok.io${NC}"
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down zrok shares...${NC}"

    if [ -f "/tmp/zrok-$FRONTEND_NAME.pid" ]; then
        kill $(cat "/tmp/zrok-$FRONTEND_NAME.pid") 2>/dev/null || true
        rm "/tmp/zrok-$FRONTEND_NAME.pid"
    fi

    if [ -f "/tmp/zrok-$BACKEND_NAME.pid" ]; then
        kill $(cat "/tmp/zrok-$BACKEND_NAME.pid") 2>/dev/null || true
        rm "/tmp/zrok-$BACKEND_NAME.pid"
    fi
    zrok release $BACKEND_NAME
    zrok release $FRONTEND_NAME

    echo -e "${GREEN}Done${NC}"
    exit 0
}

# Set up cleanup on exit
trap cleanup SIGINT SIGTERM

# Reserve shares (one-time, idempotent)
echo -e "\n${GREEN}Checking reservations...${NC}"
reserve_if_needed "$BACKEND_NAME" $BACKEND_PORT
reserve_if_needed "$FRONTEND_NAME" $FRONTEND_PORT

# Start shares
echo -e "\n${GREEN}Starting shares...${NC}"
start_share "$BACKEND_NAME" $BACKEND_PORT "Backend API"
start_share "$FRONTEND_NAME" $FRONTEND_PORT "Frontend"

echo -e "\n${GREEN}=== Services Running ===${NC}"
echo -e "Frontend: ${GREEN}https://$FRONTEND_NAME.share.zrok.io${NC}"
echo -e "Backend:  ${GREEN}https://$BACKEND_NAME.share.zrok.io${NC}"
echo -e "\nPress Ctrl+C to stop all shares"

# Wait forever (until Ctrl+C)
wait