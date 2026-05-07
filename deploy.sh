#!/usr/bin/env bash

set -e

echo "Writing SSH key..."

printf '%s' "$SG_PRIVATE_KEY_B64" | base64 --decode > /tmp/render-sg
sed -i 's/\r$//' /tmp/render-sg
chmod 600 /tmp/render-sg

echo "Testing SSH connection..."

ssh \
  -i /tmp/render-sg \
  -p "$SG_PORT" \
  -o StrictHostKeyChecking=no \
  "$SG_USER@$SG_HOST" \
  "echo SSH SUCCESS"

echo "Copying public files to SiteGround staging..."

scp \
  -i /tmp/render-sg \
  -P "$SG_PORT" \
  -o StrictHostKeyChecking=no \
  -r public/* \
  "$SG_USER@$SG_HOST:~/staging.claycraze.com/"

echo "SiteGround staging deploy complete."