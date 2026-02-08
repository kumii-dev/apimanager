#!/bin/bash

# Quick Vercel Deploy Script
# Run this after configuring environment variables in Vercel dashboard

echo "🚀 KUMII API Gateway - Quick Vercel Deploy"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found"
    echo "Install with: npm install -g vercel"
    exit 1
fi

echo "✓ Vercel CLI found"
echo ""

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel..."
    vercel login
    if [ $? -ne 0 ]; then
        echo "❌ Login failed"
        exit 1
    fi
fi

echo "✓ Logged in to Vercel"
echo ""

# Prompt for deployment type
echo "Select deployment type:"
echo "1) Preview (test deployment)"
echo "2) Production"
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo "🔍 Deploying preview..."
        vercel
        ;;
    2)
        echo ""
        echo "⚠️  WARNING: This will deploy to PRODUCTION"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            echo ""
            echo "🚢 Deploying to production..."
            vercel --prod
        else
            echo "❌ Deployment cancelled"
            exit 0
        fi
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Check deployment logs in Vercel dashboard"
echo "2. Test API: curl https://your-domain.vercel.app/health"
echo "3. Open admin UI: https://your-domain.vercel.app"
echo ""
