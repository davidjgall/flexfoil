#!/usr/bin/env bash
# Build the flexfoil-ui frontend and copy it into the Python package
# as static assets for the local server.
#
# Usage: ./build_frontend.sh
#
# This is called automatically by the CI workflow before `maturin build`,
# or you can run it manually during development.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
UI_DIR="$REPO_ROOT/flexfoil-ui"
STATIC_DIR="$SCRIPT_DIR/src/flexfoil/_static"

echo "==> Building flexfoil-ui frontend..."
cd "$UI_DIR"
npm ci --silent 2>/dev/null || npm install --silent
npm run build

echo "==> Copying dist/ to $STATIC_DIR..."
rm -rf "$STATIC_DIR"
cp -r "$UI_DIR/dist" "$STATIC_DIR"

echo "==> Frontend bundled ($(du -sh "$STATIC_DIR" | cut -f1) total)"
