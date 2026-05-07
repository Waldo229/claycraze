#!/usr/bin/env bash

set -e

echo "Testing SSH connection..."

ssh \
  -i /etc/secrets/render-sg \
  -p 18765 \
  -o StrictHostKeyChecking=no \
  $SG_USER@$SG_HOST \
  "echo SSH SUCCESS"

echo "SSH bridge works."