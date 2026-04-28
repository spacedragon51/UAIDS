import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import app from "../../artifacts/api-server/src/app";

setGlobalOptions({
  region: "us-central1",
  memory: "1GiB",
  timeoutSeconds: 60,
  maxInstances: 10,
});

export const api = onRequest(app);
