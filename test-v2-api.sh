#!/bin/bash

# Test script for /api/v2/generate endpoint

echo "Testing /api/v2/generate endpoint..."
echo ""

# Create a simple test image (1x1 white PNG in base64)
TEST_IMAGE="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

# Test 1: Without talent name (should succeed)
echo "Test 1: Without talent name"
curl -X POST http://localhost:8888/api/v2/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"imageBase64\": \"$TEST_IMAGE\",
    \"duration\": 12,
    \"language\": \"ja\"
  }" | jq .

echo ""
echo "----------------------------------------"
echo ""

# Test 2: With talent name (should generate profile and succeed)
echo "Test 2: With talent name (新垣結衣)"
curl -X POST http://localhost:8888/api/v2/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"imageBase64\": \"$TEST_IMAGE\",
    \"talentName\": \"新垣結衣\",
    \"duration\": 12,
    \"language\": \"ja\"
  }" | jq .

echo ""
echo "----------------------------------------"
echo ""

# Test 3: Invalid talent name type (should fail with 400)
echo "Test 3: Invalid talent name (number instead of string)"
curl -X POST http://localhost:8888/api/v2/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"imageBase64\": \"$TEST_IMAGE\",
    \"talentName\": 12345,
    \"duration\": 12,
    \"language\": \"ja\"
  }" | jq .

echo ""
echo "----------------------------------------"
echo ""

# Test 4: Missing imageBase64 (should fail with 400)
echo "Test 4: Missing imageBase64"
curl -X POST http://localhost:8888/api/v2/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"talentName\": \"新垣結衣\",
    \"duration\": 12,
    \"language\": \"ja\"
  }" | jq .

echo ""
echo "Test completed!"
