#!/bin/bash

# WorkBench Inventory - Reset and Add GitHub Mock Data
# This script clears existing data and adds exact GitHub mock data

echo "=========================================="
echo "Reset and Add GitHub Mock Data"
echo "=========================================="
echo ""

# Step 1: Clear existing inventory and users
echo "🗑️  Clearing existing data..."
cd /home/dell/Documents/github/workbench\ inventory

wrangler d1 execute workbench-db --remote --command "DELETE FROM inventory_fts"
echo "  ✅ Cleared FTS index"

wrangler d1 execute workbench-db --remote --command "DELETE FROM inventory_items"
echo "  ✅ Cleared inventory items"

wrangler d1 execute workbench-db --remote --command "DELETE FROM users"
echo "  ✅ Cleared users"

echo ""
echo "🔄 Adding fresh GitHub mock data..."
echo ""

# Step 2: Run the GitHub mock data script
chmod +x ./add-github-mock-data.sh
./add-github-mock-data.sh

# Step 3: Sync FTS table
echo ""
echo "🔍 Syncing full-text search index..."
wrangler d1 execute workbench-db --remote --command \
  "INSERT INTO inventory_fts (rowid, name, description, specifications)
   SELECT rowid, name, description, specifications FROM inventory_items"
echo "  ✅ FTS index synced"

echo ""
echo "=========================================="
echo "✅ Database Reset Complete!"
echo "=========================================="
echo ""
echo "Fresh data from GitHub repository:"
echo "  • 6 shops"
echo "  • 9 products"
echo "  • Full-text search enabled"
echo ""
echo "🌐 Visit: https://workbench-inventory.randunun.workers.dev"
echo ""
