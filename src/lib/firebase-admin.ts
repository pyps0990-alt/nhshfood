import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let app: App;

if (getApps().length === 0) {
  // Option 1a: base64-encoded service account JSON. Preferred for envs like
  // code-server / Docker where multi-line quoted JSON in .env gets mangled.
  if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    const decoded = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_B64,
      "base64"
    ).toString("utf8");
    const serviceAccount = JSON.parse(decoded);
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Option 1b: raw JSON service account (must be on a single line)
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Option 2: Use project ID only (works with Firestore rules bypassed by admin SDK)
    app = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
} else {
  app = getApps()[0];
}

export const adminDb = getFirestore(app);
