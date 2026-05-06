#!/usr/bin/env bash

set -euo pipefail

echo "Starting ClaycrazE deploy..."

if [ -z "${SG_USER:-}" ] || [ -z "${SG_HOST:-}" ] || [ -z "${SG_PUBLIC_HTML:-}" ]; then
  echo "ERROR: Missing SG_USER, SG_HOST, or SG_PUBLIC_HTML."
  exit 1
fi

SSH_KEY="/etc/secrets/sg_key"

if [ ! -f "$SSH_KEY" ]; then
  echo "ERROR: SSH key not found at $SSH_KEY."
  echo "Add it in Render as a Secret File named sg_key."
  exit 1
fi

chmod 600 "$SSH_KEY"

SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

echo "Deploy target:"
echo "$SG_USER@$SG_HOST:$SG_PUBLIC_HTML"

echo "Creating remote folders..."
ssh $SSH_OPTS "$SG_USER@$SG_HOST" "mkdir -p '$SG_PUBLIC_HTML/images/full' '$SG_PUBLIC_HTML/images/thumbs' '$SG_PUBLIC_HTML/data'"

echo "Uploading full images..."
rsync -avz -e "ssh $SSH_OPTS" public/images/full/ "$SG_USER@$SG_HOST:$SG_PUBLIC_HTML/images/full/"

echo "Uploading thumbnails..."
rsync -avz -e "ssh $SSH_OPTS" public/images/thumbs/ "$SG_USER@$SG_HOST:$SG_PUBLIC_HTML/images/thumbs/"

echo "Uploading data..."
rsync -avz -e "ssh $SSH_OPTS" data/ "$SG_USER@$SG_HOST:$SG_PUBLIC_HTML/data/"

echo "ClaycrazE deploy complete."