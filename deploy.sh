#!/usr/bin/env bash

set -e

echo "SG_HOST=$SG_HOST"
echo "SG_USER=$SG_USER"
echo "SG_PORT=$SG_PORT"

echo "Writing SSH key from base64 env..."

echo "$SG_PRIVATE_KEY_B64" | base64 -d > /tmp/render-sg
chmod 600 /tmp/render-sg

echo "Testing SSH connection..."

ssh \
  -i /tmp/render-sg \
  -p "$SG_PORT" \
  -o StrictHostKeyChecking=no \
  "$SG_USER@$SG_HOST" \
  "echo SSH SUCCESS"

echo "SSH bridge works."