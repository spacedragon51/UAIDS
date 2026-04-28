# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `bash scripts/deploy-firebase.sh` — deploy frontend + Cloud Functions to Firebase

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## UAIDS Project (Unbiased AI Decision System)

A fairness AI tool for healthcare, banking, and job screening built on AIF360 / Fairlearn methodologies.

### Architecture
- **Frontend** (`artifacts/uaids/`): React + Vite SPA, Firebase Auth + Firestore + Storage
- **Backend** (`artifacts/api-server/`): Express 5 with ML logic (embeddings, fairness, adversarial debiasing)
- **Cloud Functions** (`functions/`): wraps the Express app for Firebase deployment (`api` function)
- **Firebase project**: `clear-decision-e1368`

### Firebase env vars (in Replit Secrets)
- `GOOGLE_API_KEY` — Firebase web apiKey (also used server-side for Gemini embeddings)
- `VITE_FIREBASE_PROJECT_ID` — `clear-decision-e1368`
- `VITE_FIREBASE_APP_ID` — Firebase web appId
- Optional: `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_MEASUREMENT_ID`

### Firebase deployment
1. `npm install -g firebase-tools && firebase login`
2. Upgrade Firebase project to **Blaze plan** (required for Cloud Functions)
3. `firebase functions:secrets:set GOOGLE_API_KEY` (paste key)
4. `bash scripts/deploy-firebase.sh`
5. After first deploy, add the deployed domain (e.g. `clear-decision-e1368.web.app`) to **Firebase Console → Authentication → Settings → Authorized domains**.
