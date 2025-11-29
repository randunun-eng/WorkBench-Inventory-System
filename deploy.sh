#!/bin/bash

echo "🚀 Starting Deployment for WorkBench Inventory System..."

# 1. Build Frontend
echo "🏗️ Building Frontend..."
cd frontend
npm run build
cd ..

# 2. Deploy Cloudflare Workers (Backend + Frontend Assets)
echo "📦 Deploying Worker (Backend + Frontend)..."
npx wrangler deploy

echo "✅ Deployment Complete!"
