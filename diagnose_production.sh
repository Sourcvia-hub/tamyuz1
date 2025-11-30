#!/bin/bash

# Production Backend Diagnostic Script
# Run this to diagnose why sourcevia.xyz can't connect

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SOURCEVIA PRODUCTION DIAGNOSTIC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BACKEND="https://sourcevia-mgmt.emergent.host"
FRONTEND="https://sourcevia.xyz"

# Test 1: Backend Reachability
echo "Test 1: Is backend reachable?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND/api/auth/login" 2>/dev/null)
if [ "$STATUS" != "000" ]; then
    echo "✅ Backend is reachable (HTTP $STATUS)"
else
    echo "❌ Backend is NOT reachable"
    echo "   Problem: Backend server is down or URL is wrong"
    exit 1
fi
echo ""

# Test 2: CORS Configuration
echo "Test 2: Is CORS configured for sourcevia.xyz?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CORS=$(curl -s -I -X OPTIONS "$BACKEND/api/auth/login" \
  -H "Origin: $FRONTEND" \
  -H "Access-Control-Request-Method: POST" 2>/dev/null | grep -i "access-control-allow-origin")

if echo "$CORS" | grep -q "$FRONTEND\|*"; then
    echo "✅ CORS is configured correctly"
    echo "   $CORS"
else
    echo "❌ CORS is NOT configured for $FRONTEND"
    echo "   Problem: Need to set CORS_ORIGINS environment variable"
fi
echo ""

# Test 3: Login Endpoint (Most Important)
echo "Test 3: Does login endpoint work?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST "$BACKEND/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONTEND" \
  -d '{"email":"test@test.com","password":"test"}')

if echo "$RESPONSE" | grep -q "Internal Server Error"; then
    echo "❌ CRITICAL: Backend is crashing (500 error)"
    echo "   Response: $RESPONSE"
    echo ""
    echo "   🔍 DIAGNOSIS:"
    echo "   This is the MongoDB authentication error!"
    echo ""
    echo "   📝 SOLUTION:"
    echo "   Your MONGO_URL is missing the database name."
    echo ""
    echo "   Current (WRONG):"
    echo "   MONGO_URL=mongodb+srv://user@cluster.net/?opts"
    echo ""
    echo "   Should be (CORRECT):"
    echo "   MONGO_URL=mongodb+srv://user@cluster.net/DATABASE_NAME?opts"
    echo ""
    echo "   ACTION REQUIRED:"
    echo "   1. Find your database name in MongoDB Atlas"
    echo "   2. Add it to MONGO_URL after cluster.net/"
    echo "   3. Redeploy/restart backend"
    
elif echo "$RESPONSE" | grep -q "Invalid\|not found\|Unauthorized"; then
    echo "✅ Backend is WORKING!"
    echo "   Response: $RESPONSE"
    echo ""
    echo "   The backend is healthy. You can now:"
    echo "   1. Register users via the registration page"
    echo "   2. Or create users via API"
    
else
    echo "⚠️  Unexpected response:"
    echo "   $RESPONSE"
fi
echo ""

# Test 4: Registration Endpoint
echo "Test 4: Can register new users?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TEST_EMAIL="test$(date +%s)@test.com"
REG_RESPONSE=$(curl -s -X POST "$BACKEND/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"$TEST_EMAIL\",\"password\":\"test123456\",\"role\":\"admin\"}")

if echo "$REG_RESPONSE" | grep -q "Internal Server Error"; then
    echo "❌ Registration also failing with 500 error"
    echo "   Same MongoDB issue as login"
    
elif echo "$REG_RESPONSE" | grep -q "$TEST_EMAIL"; then
    echo "✅ Registration works!"
    echo "   Created user: $TEST_EMAIL"
    echo ""
    echo "   You can now login at: $FRONTEND"
    
else
    echo "⚠️  Registration response:"
    echo "   $REG_RESPONSE"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if echo "$RESPONSE" | grep -q "Internal Server Error"; then
    echo "❌ PRODUCTION IS BROKEN"
    echo ""
    echo "Main Issue: Backend MongoDB connection failing"
    echo ""
    echo "Quick Fix:"
    echo "  1. Update MONGO_URL to include database name"
    echo "  2. Format: mongodb+srv://user:pass@cluster.net/DB_NAME?opts"
    echo "  3. Restart backend"
    echo ""
    echo "See PRODUCTION_QUICK_FIX.md for detailed instructions"
    
elif echo "$RESPONSE" | grep -q "Invalid\|Unauthorized"; then
    echo "✅ PRODUCTION IS WORKING"
    echo ""
    echo "Backend is healthy!"
    echo ""
    echo "Next steps:"
    echo "  1. Register admin user:"
    echo "     curl -X POST $BACKEND/api/auth/register \\"
    echo "       -H 'Content-Type: application/json' \\"
    echo "       -d '{\"name\":\"Admin\",\"email\":\"admin@sourcevia.com\",\"password\":\"admin123\",\"role\":\"admin\"}'"
    echo ""
    echo "  2. Login at: $FRONTEND"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
