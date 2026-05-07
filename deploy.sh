#!/usr/bin/env bash

set -e

echo "=== SECRET FILE CHECK ==="

find /etc -name "render-sg" 2>/dev/null || true
find /opt -name "render-sg" 2>/dev/null || true

echo "=== ENV ==="

echo "SG_HOST=$SG_HOST"
echo "SG_USER=$SG_USER"
echo "SG_PORT=$SG_PORT"

echo "=== DONE ==="