#!/bin/bash

BACKEND="https://sourcevia-secure.emergent.host"
ORIGIN="https://sourcevia.xyz"

echo "=========================================="
echo "Production CORS Verification"
echo "Backend: $BACKEND"
echo "Origin: $ORIGIN"
echo "=========================================="

echo -e "\n✅ Testing /api/health"
curl -s -X OPTIONS $BACKEND/api/health \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  -v 2>&1 | grep "< access-control-allow-origin" || echo "❌ No CORS header"

echo -e "\n✅ Testing /api/auth/me"
curl -s -X OPTIONS $BACKEND/api/auth/me \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  -v 2>&1 | grep "< access-control-allow-origin" || echo "❌ No CORS header"

echo -e "\n✅ Testing /api/auth/login"
curl -s -X OPTIONS $BACKEND/api/auth/login \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -v 2>&1 | grep "< access-control-allow-origin" || echo "❌ No CORS header"

echo -e "\n✅ Testing /api/auth/register"
curl -s -X OPTIONS $BACKEND/api/auth/register \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -v 2>&1 | grep "< access-control-allow-origin" || echo "❌ No CORS header"

echo -e "\n=========================================="
echo "If all tests show 'access-control-allow-origin',"
echo "then CORS is working correctly! ✅"
echo ""
echo "If any test shows '❌ No CORS header',"
echo "then backend needs to be deployed with latest code."
echo "=========================================="
