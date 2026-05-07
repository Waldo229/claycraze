#!/usr/bin/env bash

set -e

echo "SG_HOST=$SG_HOST"
echo "SG_USER=$SG_USER"
echo "SG_PORT=$SG_PORT"

echo "Testing SSH connection..."

ls -l /etc/secrets/render-sg

ssh \
  -i /etc/secrets/render-sg \
  -p "$SG_PORT" \
  -o StrictHostKeyChecking=no \
  "$SG_USER@$SG_HOST" \
  "echo SSH SUCCESS"

echo "SSH bridge works."