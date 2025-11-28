#!/bin/bash

# WorkBench Inventory - Deployment Verification Script
# This script verifies that your deployment is working correctly

echo "=========================================="
echo "WorkBench Inventory Deployment Verification"
echo "=========================================="
echo ""

BASE_URL="https://workbench-inventory.randunun.workers.dev"

# Test 1: API Status
echo "🔍 Test 1: API Status Check"
API_RESPONSE=$(curl -s "$BASE_URL/api")
if echo "$API_RESPONSE" | grep -q "WorkBench Inventory API is running"; then
    echo "✅ API is running"
    echo "   Response: $API_RESPONSE"
else
    echo "❌ API check failed"
    echo "   Response: $API_RESPONSE"
fi
echo ""

# Test 2: Frontend Homepage
echo "🔍 Test 2: Frontend Homepage"
HOMEPAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [ "$HOMEPAGE_STATUS" = "200" ]; then
    echo "✅ Frontend homepage loads successfully"
    echo "   HTTP Status: $HOMEPAGE_STATUS"
else
    echo "❌ Frontend homepage failed"
    echo "   HTTP Status: $HOMEPAGE_STATUS"
fi
echo ""

# Test 3: Join Page (Client-side routing)
echo "🔍 Test 3: Join Page Routing"
JOIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/join")
if [ "$JOIN_STATUS" = "200" ]; then
    echo "✅ Join page routing works"
    echo "   HTTP Status: $JOIN_STATUS"
else
    echo "❌ Join page routing failed"
    echo "   HTTP Status: $JOIN_STATUS"
fi
echo ""

# Test 4: Search API
echo "🔍 Test 4: Search API"
SEARCH_RESPONSE=$(curl -s "$BASE_URL/api/search?q=test")
if [ -n "$SEARCH_RESPONSE" ]; then
    echo "✅ Search API is working"
    echo "   Response: $SEARCH_RESPONSE"
else
    echo "❌ Search API failed"
fi
echo ""

# Test 5: CORS Headers
echo "🔍 Test 5: CORS Configuration"
CORS_HEADER=$(curl -s -I "$BASE_URL/api" | grep -i "access-control-allow-origin")
if [ -n "$CORS_HEADER" ]; then
    echo "✅ CORS is configured"
    echo "   Header: $CORS_HEADER"
else
    echo "⚠️  CORS header not detected (may be request-dependent)"
fi
echo ""

# Test 6: Worker Response Time
echo "🔍 Test 6: Worker Performance"
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/api")
echo "✅ Worker response time: ${RESPONSE_TIME}s"
echo ""

# Summary
echo "=========================================="
echo "📊 Deployment Summary"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""
echo "Available Routes:"
echo "  • Homepage:        $BASE_URL/"
echo "  • Join/Register:   $BASE_URL/join"
echo "  • API Status:      $BASE_URL/api"
echo "  • Search:          $BASE_URL/api/search?q=<query>"
echo "  • Shop:            $BASE_URL/api/shop/<slug>"
echo "  • Auth Login:      $BASE_URL/auth/login"
echo "  • Auth Signup:     $BASE_URL/auth/signup"
echo ""
echo "🎉 Deployment verification complete!"
echo "Visit $BASE_URL to see your application"
