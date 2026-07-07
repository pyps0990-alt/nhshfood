import webpush from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const privateKey = process.env.VAPID_PRIVATE_KEY || "";
const contactEmail = process.env.GMAIL_USER || "mailto:admin@example.com";

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    contactEmail.startsWith("mailto:") ? contactEmail : `mailto:${contactEmail}`,
    publicKey,
    privateKey
  );
}

export interface PushPayload {
  title: string;
  body: string;
  orderNumber: string;
  orderId: string;
  status: string;
}

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: PushPayload
): Promise<{ sent: boolean; reason?: string }> {
  if (!publicKey || !privateKey) {
    return { sent: false, reason: "vapid_not_configured" };
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { sent: true };
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    console.error("Push notification error:", err);
    // 410 Gone or 404 means subscription expired
    if (statusCode === 410 || statusCode === 404) {
      return { sent: false, reason: "subscription_expired" };
    }
    return { sent: false, reason: "send_failed" };
  }
}
