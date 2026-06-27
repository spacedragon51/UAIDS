#!/usr/bin/env bash
# UAIDS Firebase deployment script.
# Builds the frontend and Cloud Functions bundle, then deploys both to Firebase.
#
# Prerequisites:
#   1. Firebase CLI installed:        npm install -g firebase-tools
#   2. Logged in:                     firebase login
#   3. Project on the Blaze plan      (required for Cloud Functions)
#   4. Secrets configured:            firebase functions:secrets:set GOOGLE_API_KEY
#   5. The following env vars exported in your shell before running:
#        GOOGLE_API_KEY              (Firebase web apiKey)
#        VITE_FIREBASE_PROJECT_ID    (e.g. clear-decision-e1368)
#        VITE_FIREBASE_APP_ID        (Firebase web appId)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Building frontend (artifacts/uaids)"
NODE_ENV=production pnpm --filter @workspace/uaids run build

echo "==> Building Cloud Function bundle (functions)"
pnpm --filter uaids-functions run build

echo "==> Deploying to Firebase (hosting + functions)"
firebase deploy --only hosting,functions

echo "==> Deploy complete. Open:"
firebase hosting:channel:list 2>/dev/null || true
echo "    https://clear-decision-e1368.web.app"
