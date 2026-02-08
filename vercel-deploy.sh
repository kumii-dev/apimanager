#!/bin/bash

# Vercel Deployment Script
# Ensures both gateway and admin client are ready for deployment

echo "🚀 Preparing KUMII API Gateway for Vercel deployment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if required environment files exist
echo -e "${YELLOW}Checking environment configuration...${NC}"

if [ ! -f "gateway-server/.env" ]; then
    echo -e "${RED}❌ gateway-server/.env not found${NC}"
    echo "Copy gateway-server/.env.example and configure it"
    exit 1
fi

if [ ! -f "admin-client/.env" ]; then
    echo -e "${RED}❌ admin-client/.env not found${NC}"
    echo "Copy admin-client/.env.example and configure it"
    exit 1
fi

echo -e "${GREEN}✓ Environment files found${NC}"

# Install dependencies
echo -e "${YELLOW}Installing gateway-server dependencies...${NC}"
cd gateway-server
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install gateway-server dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Gateway dependencies installed${NC}"

# Build gateway
echo -e "${YELLOW}Building gateway-server...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build gateway-server${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Gateway built successfully${NC}"

cd ..

# Install admin client dependencies
echo -e "${YELLOW}Installing admin-client dependencies...${NC}"
cd admin-client
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install admin-client dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Admin client dependencies installed${NC}"

# Build admin client
echo -e "${YELLOW}Building admin-client...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build admin-client${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Admin client built successfully${NC}"

cd ..

# Run security checks
echo -e "${YELLOW}Running security audit...${NC}"
cd gateway-server
npm audit --audit-level=moderate
cd ..

# Success
echo ""
echo -e "${GREEN}✅ Build complete! Ready for Vercel deployment${NC}"
echo ""
echo "Next steps:"
echo "  1. Deploy: vercel --prod"
echo "  2. Or push to main branch for automatic deployment"
echo "  3. Configure environment variables in Vercel dashboard"
echo ""
echo "Documentation: docs/VERCEL_DEPLOYMENT.md"
