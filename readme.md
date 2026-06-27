UAIDS — Unbiased AI Decision System
An open-source fairness AI toolkit for auditing and mitigating bias in AI decision systems across healthcare, banking, and hiring. Built on AIF360 and Fairlearn methodologies.

What it does
Domain	What UAIDS checks
Job Screening	Resume bias by ethnicity, gender, and graduation year — disparate impact, per-group selection rate, TPR/FPR, adversarial debiasing
Healthcare	Clinical trial / melanoma diagnosis bias — representation gaps, fairness-aware preprocessing
Loan Approval	Credit decision bias — protected group analysis, reweighting mitigation, compliance reporting
The system follows a MEASURE → FLAG → FIX pipeline:

Upload a CSV dataset (or use the built-in sample)
Detect protected attributes and measure per-group statistics
Flag disparate impact violations (< 0.8 threshold, EEOC guidelines)
Apply adversarial debiasing or reweighting to produce a fair model
Generate a compliance report with before/after metrics
Architecture
┌─────────────────────────────────────────────────────┐
│  Firebase Hosting                                   │
│  React + Vite SPA  (artifacts/uaids/)               │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Auth       │  │ Firestore    │  │ Storage     │ │
│  │ (Google,   │  │ (user data,  │  │ (saved CSVs)│ │
│  │  email)    │  │  audit log)  │  │             │ │
│  └────────────┘  └──────────────┘  └─────────────┘ │
└──────────────────────────┬──────────────────────────┘
                           │ /api/** rewrite
┌──────────────────────────▼──────────────────────────┐
│  Firebase Cloud Function  (functions/)              │
│  wraps Express 5 ML backend (artifacts/api-server/) │
│  ┌────────────────────────────────────────────────┐ │
│  │ Routes: /api/upload, /api/bias-report,         │ │
│  │         /api/clinical, /api/loan, /api/train,  │ │
│  │         /api/fairness, /api/compliance, ...    │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

Monorepo layout:

artifacts/
  uaids/          — React + Vite frontend
  api-server/     — Express 5 ML backend
functions/        — Firebase Cloud Function wrapper
lib/
  db/             — PostgreSQL + Drizzle ORM (shared)
  api-spec/       — OpenAPI spec + Orval codegen
scripts/
  deploy-firebase.sh  — one-command deploy

Tech stack
Layer	Technology
Frontend	React 18, Vite 7, Tailwind CSS, shadcn/ui, React Query
Auth	Firebase Authentication (email/password + Google)
Database	Firestore (user profiles, audit log), Firebase Storage (CSV datasets)
Backend	Express 5, TypeScript, pino logging
ML / Fairness	Adversarial debiasing, reweighting, disparate impact metrics
Embeddings	Google Gemini API (clinical analysis)
Deployment	Firebase Hosting + Cloud Functions (us-central1)
Monorepo	pnpm workspaces, TypeScript project references
Local development
Prerequisites
Node.js 20+
pnpm (npm install -g pnpm)
1. Clone and install
git clone <your-repo>
cd <repo>
pnpm install

2. Set environment variables
Create a .env file in the project root (or set via Replit Secrets):

# Firebase web SDK (from Firebase Console → Project Settings → Your apps)
GOOGLE_API_KEY=AIza...              # Firebase web apiKey
VITE_FIREBASE_PROJECT_ID=clear-decision-e1368
VITE_FIREBASE_APP_ID=1:...:web:...
# Optional (auto-derived from project ID if not set)
VITE_FIREBASE_AUTH_DOMAIN=clear-decision-e1368.firebaseapp.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_MEASUREMENT_ID=G-...

3. Run the API server
pnpm --filter @workspace/api-server run dev

4. Run the frontend
pnpm --filter @workspace/uaids run dev

The app will be available at http://localhost:<PORT>.

Firebase setup (one-time)
1. Install Firebase CLI and log in
npm install -g firebase-tools
firebase login

2. Upgrade to the Blaze plan
Cloud Functions require the Blaze (pay-as-you-go) plan. There is a generous free tier — 2 million function invocations per month are free.

Go to: Firebase Console → ⚙️ Settings → Usage and billing → Modify plan → Blaze

3. Store the Gemini API key as a Firebase secret
firebase functions:secrets:set GOOGLE_API_KEY
# Paste your Google API key when prompted

4. Add your domain to Firebase Auth
Go to Firebase Console → Authentication → Settings → Authorized domains and add:

Environment	Domain
Replit dev	<your-repl-domain>.spock.replit.dev
After deploy	Already auto-added: clear-decision-e1368.web.app
Custom domain	Add manually if you configure one
This step is required for Google sign-in to work.

5. Set Firebase Storage security rules
Create storage.rules in the project root:

rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/datasets/{file} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}

Add to firebase.json under "storage": { "rules": "storage.rules" }.

Deploy to Firebase
bash scripts/deploy-firebase.sh

This script:

Builds the React frontend (artifacts/uaids/dist/public/)
Bundles the Cloud Function (functions/dist/index.mjs)
Runs firebase deploy --only hosting,functions
Your app will be live at:

https://clear-decision-e1368.web.app
https://clear-decision-e1368.firebaseapp.com
Key commands
Command	What it does
pnpm run typecheck	Full TypeScript check across all packages
pnpm run build	Typecheck + build all packages
pnpm --filter @workspace/api-server run dev	Run the ML API server locally
pnpm --filter @workspace/uaids run dev	Run the React frontend locally
pnpm --filter @workspace/api-spec run codegen	Regenerate API hooks from OpenAPI spec
pnpm --filter @workspace/db run push	Push DB schema changes (dev only)
bash scripts/deploy-firebase.sh	Deploy everything to Firebase
Features
Bias audit — per-group selection rates, true/false positive rates, disparate impact ratio
Adversarial debiasing — fairness-constrained model training that preserves accuracy
Reweighting mitigation — sample-level reweighting to equalize group representation
Compliance reports — EEOC-style fair-hiring / clinical compliance output
Saved datasets — signed-in users can save, re-run, and delete their uploaded CSVs
Audit log — Firestore-backed history of every scan run per user
Multilingual UI — i18n support built in
Dark / light mode — system-preference aware
Guest access — explore the tool without an account
Project structure highlights
artifacts/uaids/src/
  pages/
    Homepage.tsx         — landing page
    Auth.tsx             — sign-in / register / Google OAuth
    Dashboard.tsx        — user dashboard with audit stats
    JobScreening.tsx     — resume screening pipeline
    Healthcare.tsx       — melanoma / clinical fairness
    LoanApproval.tsx     — credit decision fairness
  lib/
    firebase.ts          — Firebase app + auth + Firestore + Storage init
    firebaseStorage.ts   — Storage helpers (upload, list, delete datasets)
    jobScreeningApi.ts   — API client for resume pipeline
    clinicalApi.ts       — API client for healthcare pipeline
    auditStats.ts        — Firestore audit log helpers
  hooks/
    useAuth.tsx          — auth state, sign-in methods, role management
artifacts/api-server/src/routes/
  dataset.ts      — CSV upload + preprocessing
  fairness.ts     — per-group metric calculation
  model.ts        — adversarial debiasing training
  compliance.ts   — compliance report generation
  clinical.ts     — healthcare analysis (Gemini embeddings)
  sample.ts       — bundled sample dataset