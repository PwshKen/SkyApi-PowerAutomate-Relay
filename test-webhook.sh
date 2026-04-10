#!/usr/bin/env bash
# Test script for the webhook endpoint

BASE_URL="http://localhost:7071/api/webhook"
WEBHOOK_KEY="replace-with-your-secret"

echo "=== 1. OPTIONS — CloudEvents handshake ==="
curl -s -i -X OPTIONS "$BASE_URL" \
  -H "webhook-request-origin: eventgrid.azure.net"

echo -e "\n\n=== 2. POST — Valid key, sample Blackbaud event ==="
curl -s -i -X POST "$BASE_URL?webhookKey=$WEBHOOK_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-event-001",
    "type": "constituent.updated",
    "data": {
      "constituentId": "12345",
      "firstName": "Jane",
      "lastName": "Doe"
    },
    "time": "2026-04-09T12:00:00Z"
  }'

echo -e "\n\n=== 3. POST — Missing key (should still return 200) ==="
curl -s -i -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"id": "test-event-002", "type": "test"}'

echo -e "\n\n=== 4. POST — Wrong key (should still return 200) ==="
curl -s -i -X POST "$BASE_URL?webhookKey=wrong-key" \
  -H "Content-Type: application/json" \
  -d '{"id": "test-event-003", "type": "test"}'

echo ""