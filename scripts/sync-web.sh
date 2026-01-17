#!/bin/sh
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_DIR="$ROOT_DIR/web"

mkdir -p "$WEB_DIR"

rsync -a --delete \
  "$ROOT_DIR/index.html" \
  "$ROOT_DIR/style.css" \
  "$ROOT_DIR/colorConfig.js" \
  "$ROOT_DIR/colorSystem.js" \
  "$ROOT_DIR/css" \
  "$ROOT_DIR/js" \
  "$WEB_DIR"
