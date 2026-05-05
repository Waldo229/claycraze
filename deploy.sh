#!/bin/bash
set -e

DRY_RUN=""
if [ "$1" = "--dry-run" ]; then
  DRY_RUN="-n"
fi

SG_USER="YOUR_SG_USER"
SG_HOST="YOUR_SG_HOST"
SG_PUBLIC_HTML="/home/YOUR_SG_USER/public_html"

if [ "$SG_USER" = "YOUR_SG_USER" ] || [ "$SG_HOST" = "YOUR_SG_HOST" ]; then
  echo "ERROR: Edit deploy.sh and set SG_USER, SG_HOST, and SG_PUBLIC_HTML first." >&2
  exit 1
fi

echo "Uploading images..."
rsync -avz $DRY_RUN public/images/ "$SG_USER@$SG_HOST:$SG_PUBLIC_HTML/images/"

echo "Uploading data..."
rsync -avz $DRY_RUN data/ "$SG_USER@$SG_HOST:$SG_PUBLIC_HTML/data/"

echo "ClaycrazE deployment complete."
