#!/bin/bash

# Android API Connectivity Test Script
# This script tests all the required API endpoints for the Android app

API_BASE="http://localhost:5174/api"
echo "🔧 Testing Android API Connectivity"
echo "=================================="

# Test 1: Login API (National Admin)
echo ""
echo "1. Testing Login API (National Admin)..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123","deviceId":"test-device-001","deviceInfo":"Test Device"}')

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Login API working"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"deviceToken":"[^"]*' | cut -d'"' -f4)
    echo "   Device token received: ${TOKEN:0:50}..."
else
    echo "❌ Login API failed"
    echo "   Response: $LOGIN_RESPONSE"
    exit 1
fi

# Test 2: Device Token Verification
echo ""
echo "2. Testing Device Token Verification..."
VERIFY_RESPONSE=$(curl -s -X POST "$API_BASE/auth/verify" \
  -H "Authorization: Bearer $TOKEN")

if echo "$VERIFY_RESPONSE" | grep -q '"valid":true'; then
    echo "✅ Token verification working"
else
    echo "❌ Token verification failed"
    echo "   Response: $VERIFY_RESPONSE"
fi

# Test 3: Login API (Partner Manager)
echo ""
echo "3. Testing Login API (Partner Manager)..."
PARTNER_LOGIN=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@example.com","password":"password123","deviceId":"test-device-002","deviceInfo":"Test Device"}')

if echo "$PARTNER_LOGIN" | grep -q '"success":true'; then
    echo "✅ Partner login working"
    PARTNER_TOKEN=$(echo "$PARTNER_LOGIN" | grep -o '"deviceToken":"[^"]*' | cut -d'"' -f4)
else
    echo "❌ Partner login failed"
    echo "   Response: $PARTNER_LOGIN"
fi

# Test 4: Schools API (with valid token)
echo ""
echo "4. Testing Schools API..."
if [ ! -z "$PARTNER_TOKEN" ]; then
    SCHOOLS_RESPONSE=$(curl -s -X POST "$API_BASE/schools/by-partner" \
      -H "Authorization: Bearer $PARTNER_TOKEN" \
      -H "Content-Type: application/json")

    if echo "$SCHOOLS_RESPONSE" | grep -q '\['; then
        echo "✅ Schools API working"
    else
        echo "❌ Schools API failed"
        echo "   Response: $SCHOOLS_RESPONSE"
    fi
else
    echo "⚠️  Skipping Schools API test (no partner token)"
fi

# Test 5: Survey Submit API (without token - should fail)
echo ""
echo "5. Testing Survey Submit API (without token)..."
SURVEY_RESPONSE=$(curl -s -X POST "$API_BASE/surveys/submit" \
  -H "Content-Type: application/json" \
  -d '{"survey_unique_id":"test-survey","student_name":"Test Student"}')

if echo "$SURVEY_RESPONSE" | grep -q '"error"'; then
    echo "✅ Survey API properly secured (rejects unauthorized requests)"
else
    echo "❌ Survey API security issue"
    echo "   Response: $SURVEY_RESPONSE"
fi

# Test 6: Sync Status API
echo ""
echo "6. Testing Sync Status API..."
SYNC_RESPONSE=$(curl -s -X POST "$API_BASE/sync/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceInfo":"Test Device"}')

if echo "$SYNC_RESPONSE" | grep -q '"success"'; then
    echo "✅ Sync status API working"
else
    echo "❌ Sync status API failed"
    echo "   Response: $SYNC_RESPONSE"
fi

echo ""
echo "🎯 API Connectivity Test Complete!"
echo "=================================="
echo ""
echo "📱 For Android Emulator Testing:"
echo "   - The app should use http://10.0.2.2:5174/api in debug builds"
echo "   - Make sure the emulator can access the host machine"
echo "   - Use the Android app name: edu.aiims.rpcschoolsurvey"
echo ""
echo "🔐 Authentication Flow:"
echo "   1. Login with credentials → Receive device token"
echo "   2. Set up local PIN in Android app"
echo "   3. Use device token for all API calls"
echo "   4. Submit surveys with immediate ACK"
echo ""
echo "📋 API Endpoints Tested:"
echo "   - POST /api/auth/login (✓)"
echo "   - POST /api/auth/verify (✓)"
echo "   - POST /api/schools/by-partner (✓)"
echo "   - POST /api/surveys/submit (✓)"
echo "   - POST /api/sync/status (✓)"