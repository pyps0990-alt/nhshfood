import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let app: App;

if (getApps().length === 0) {
  // Option 1: Use service account JSON (recommended for production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
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
