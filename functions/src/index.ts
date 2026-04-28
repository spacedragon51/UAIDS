import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import app from "../../artifacts/api-server/src/app";

setGlobalOptions({
  region: "us-central1",
  memory: "1GiB",
  timeoutSeconds: 60,
  maxInstances: 10,
});

// GOOGLE_API_KEY is used by clinical analysis for Gemini embeddings.
// Configure with: firebase functions:secrets:set GOOGLE_API_KEY
const googleApiKey = defineSecret("GOOGLE_API_KEY");

export const api = onRequest(
  { secrets: [googleApiKey] },
  app,
);
