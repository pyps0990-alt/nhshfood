"use client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function subscribeToPush(studentId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "此瀏覽器不支援推播通知" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "通知權限未允許，請在瀏覽器設定中開啟" };
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    return { ok: false, reason: "推播設定尚未完成（VAPID key 未設定）" };
  }

  try {
    let reg = navigator.serviceWorker.controller
      ? await navigator.serviceWorker.ready
      : await navigator.serviceWorker.register("/sw.js");

    if ("installing" in reg && reg.installing) {
      await new Promise<void>((resolve) => {
        const sw = (reg as ServiceWorkerRegistration).installing!;
        sw.addEventListener("statechange", () => {
          if (sw.state === "activated") resolve();
        });
      });
      reg = await navigator.serviceWorker.ready;
    } else if (!("pushManager" in reg)) {
      reg = await navigator.serviceWorker.ready;
    }

    const swReg = reg as ServiceWorkerRegistration;
    const existing = await swReg.pushManager.getSubscription();
    const subscription = existing ?? await swReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, subscription: subscription.toJSON() }),
    });

    if (!res.ok) {
      return { ok: false, reason: "伺服器儲存訂閱失敗" };
    }
    return { ok: true };
  } catch (err) {
    console.error("Push subscribe error:", err);
    return { ok: false, reason: `推播訂閱失敗：${err instanceof Error ? err.message : "未知錯誤"}` };
  }
}

export async function unsubscribeFromPush(studentId: string): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
    }

    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
  } catch (err) {
    console.error("Push unsubscribe error:", err);
  }
}
