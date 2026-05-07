#!/usr/bin/env bash

set -e

echo "SG_HOST=$SG_HOST"
echo "SG_USER=$SG_USER"
echo "SG_PORT=$SG_PORT"
echo "KEY_B64_LENGTH=${#SG_PRIVATE_KEY_B64}"

if [ -z "$SG_PRIVATE_KEY_B64" ]; then
  echo "ERROR: SG_PRIVATE_KEY_B64 is empty"
  exit 1
fi

echo "Writing SSH key..."

printf '%s' "$SG_PRIVATE_KEY_B64" | base64 --decode > /tmp/render-sg
sed -i 's/\r$//' /tmp/render-sg
chmod 600 /tmp/render-sg

echo "Key file size:"
wc -c /tmp/render-sg

echo "Key header:"
head -n 1 /tmp/render-sg

echo "Testing SSH connection..."

ssh \
  -i /tmp/render-sg \
  -p "$SG_PORT" \
  -o StrictHostKeyChecking=no \
  "$SG_USER@$SG_HOST" \
  "echo SSH SUCCESS"

echo "SSH bridge works."