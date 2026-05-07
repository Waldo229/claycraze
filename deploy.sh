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

echo "Deploying repo files to SiteGround staging public_html..."

rsync -avz --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude ".env" \
  --exclude "*.db" \
  --exclude "deploy.sh" \
  -e "ssh -i /tmp/render-sg -p $SG_PORT -o StrictHostKeyChecking=no" \
  ./ \
  "$SG_USER@$SG_HOST:~/staging.claycraze.com/public_html/"

echo "SiteGround staging deploy complete."