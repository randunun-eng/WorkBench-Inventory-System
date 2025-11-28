#!/bin/bash

echo "🚀 Starting Deployment for WorkBench Inventory System..."

# 1. Deploy Cloudflare Workers (Backend)
echo "📦 Deploying Backend (Workers)..."
npx wrangler deploy

# 2. Build Frontend
echo "🏗️ Building Frontend..."
cd frontend
npm run build
cd ..

# 3. Deploy Frontend (Pages)
echo "🌐 Deploying Frontend (Pages)..."
# Note: You need to create a Pages project first or let wrangler create one
npx wrangler pages deploy frontend/dist --project-name workbench-frontend

echo "✅ Deployment Complete!"
