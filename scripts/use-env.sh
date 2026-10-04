#!/bin/sh
# Switches which backend the app talks to by copying .env.<name> over .env —
# the one file react-native-dotenv reads (babel.config.js), Metro and Xcode
# release builds alike.
#
#   yarn env:dev    → .env.dev   (a backend on this machine)
#   yarn env:prod   → .env.prod  (the deployed backend on Cloud Run)
#
# Values are compiled into the bundle, so Metro needs --reset-cache after a
# switch; the start:dev / start:prod scripts do that for you.
set -e

name="$1"
src=".env.$name"

if [ -z "$name" ]; then
  echo "usage: scripts/use-env.sh <dev|prod>" >&2
  exit 1
fi
if [ ! -f "$src" ]; then
  echo "No $src. Create it from .env.example." >&2
  exit 1
fi

{
  echo "# Generated from $src by scripts/use-env.sh. Edit $src, not this file."
  cat "$src"
} > .env

backend=$(grep -E '^BACKEND_URL=' "$src" | cut -d= -f2-)
if [ -n "$backend" ]; then
  echo "App → $backend"
else
  ip=$(grep -E '^Local_IP=' "$src" | cut -d= -f2-)
  echo "App → http://${ip:-localhost}:3000 (local backend)"
fi
