"use client";

import { useEffect, useState } from "react";
import {
  db,
  collection,
  doc,
  query,
  where,
  onSnapshot,
} from "./firebase";
import { listenerManager } from "./realtime";
import type { MenuItem, Order } from "@/types";

// ==================== Menu (shared realtime listener, cached) ====================
const menuCache = new Map<string, { items: MenuItem[]; fetchTime: number }>();
const MENU_CACHE_TTL = 60_000;

// Prefetch menu data via REST API (much faster first load than Firestore SDK)
const prefetchPromises = new Map<string, Promise<void>>();

export function prefetchMenu(department: string) {
  if (menuCache.has(department)) return;
  if (prefetchPromises.has(department)) return;
  const p = fetch(`/api/menu?department=${department}`)
    .then((r) => r.ok ? r.json() : [])
    .then((items: MenuItem[]) => {
      if (!menuCache.has(department)) {
        menuCache.set(department, { items, fetchTime: Date.now() });
      }
    })
    .catch(() => {})
    .finally(() => prefetchPromises.delete(department));
  prefetchPromises.set(department, p);
}

export function useMenuItems(department: string) {
  const cached = menuCache.get(department);
  const [items, setItems] = useState<MenuItem[]>(cached?.items || []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    // If we have no cached items, show loading and start a fallback timeout so
    // the customer sees a retryable message instead of an infinite skeleton
    // when the connection stalls or Firestore rejects the query.
    const startFresh = !menuCache.get(department);
    if (startFresh) setLoading(true);

    const timeout = setTimeout(() => {
      if (cancelled) return;
      // Only surface the timeout as an error if we haven't received any data yet.
      setItems((prev) => {
        if (prev.length === 0) setError("連線逾時，請確認網路後重試");
        return prev;
      });
      setLoading(false);
    }, 8000);

    const key = `menu-${department}`;
    const unsub = listenerManager.subscribe(
      key,
      "menuItems",
      [where("department", "==", department)],
      (snap) => {
        if (cancelled) return;
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as MenuItem))
          .filter((i) => i.available)
          .sort((a, b) => (a.category || "").localeCompare(b.category || ""));
        menuCache.set(department, { items: data, fetchTime: Date.now() });
        setItems(data);
        setLoading(false);
        setError(null);
        clearTimeout(timeout);
      },
      (err) => {
        if (cancelled) return;
        console.error("Menu subscription error:", err);
        setError("菜單載入失敗，請稍後重試");
        setLoading(false);
        clearTimeout(timeout);
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      unsub();
    };
  }, [department, retryToken]);

  const retry = () => {
    menuCache.delete(department);
    setItems([]);
    setRetryToken((n) => n + 1);
  };

  return { items, loading, error, retry };
}

export function useAllMenuItems(department: string) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = `menu-all-${department}`;
    const unsub = listenerManager.subscribe(
      key,
      "menuItems",
      [where("department", "==", department)],
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as MenuItem))
          .sort((a, b) => (a.category || "").localeCompare(b.category || ""));
        setItems(data);
        setLoading(false);
      }
    );
    return unsub;
  }, [department]);

  return { items, loading };
}

// ==================== Orders (today only, shared listener) ====================
export function useOrders(department: string, filterStatus?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Query only today's orders using createdAt >= todayStart
    const q = query(
      collection(db, "orders"),
      where("createdAt", ">=", todayStart)
    );
    const unsub = onSnapshot(q, (snap) => {
      let data = snap.docs.map((d) => {
        const raw = d.data();
        const createdAt = raw.createdAt?.toDate?.() ?? new Date();
        return {
          id: d.id,
          ...raw,
          createdAt: createdAt instanceof Date ? createdAt.toISOString() : new Date().toISOString(),
        } as Order & { _createdDate: Date };
      });
      // Filter department and status in JS (avoids composite index)
      data = data.filter((o) => o.department === department);
      if (filterStatus && filterStatus !== "all") {
        data = data.filter((o) => o.status === filterStatus);
      }
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(data);
      setLoading(false);
    });
    return unsub;
  }, [department, filterStatus]);

  return { orders, loading };
}

export function useOrder(id: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "orders", id), (snap) => {
      if (!snap.exists()) {
        setOrder(null);
      } else {
        const raw = snap.data();
        setOrder({
          id: snap.id,
          ...raw,
          createdAt: raw.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
        } as Order);
      }
      setLoading(false);
    });
    return unsub;
  }, [id]);

  return { order, loading };
}

// ==================== Secure writes via API routes ====================

// Request deduplication for order submission
import { isWithinSchool } from "./geo";

let locationCache: { ok: boolean; error?: string; coords?: { lat: number; lng: number }; requireLocation: boolean; ts: number } | null = null;
const LOCATION_CACHE_MS = 5 * 60 * 1000;

export async function checkSchoolLocation(): Promise<{ ok: boolean; error?: string; coords?: { lat: number; lng: number } }> {
  let requireLocation = true;
  try {
    const cfgRes = await fetch("/api/settings/app-config", { cache: "no-store" });
    if (cfgRes.ok) {
      const cfg = await cfgRes.json();
      requireLocation = cfg.requireLocation !== false;
    }
  } catch {}

  // If the requireLocation setting changed since we last checked, invalidate
  // the cache so we don't reuse a "pass" from when the check was off.
  if (locationCache && locationCache.requireLocation !== requireLocation) {
    locationCache = null;
  }

  if (!requireLocation) {
    locationCache = { ok: true, requireLocation: false, ts: Date.now() };
    return { ok: true };
  }

  if (locationCache && Date.now() - locationCache.ts < LOCATION_CACHE_MS) {
    return { ok: locationCache.ok, error: locationCache.error, coords: locationCache.coords };
  }

  if (!navigator.geolocation) return { ok: false, error: "此裝置不支援定位功能" };
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 300000 })
    );
    const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    if (!isWithinSchool(coords.lat, coords.lng)) {
      locationCache = { ok: false, error: "請在校園範圍內下單", coords, requireLocation: true, ts: Date.now() };
      return { ok: false, error: "請在校園範圍內下單", coords };
    }
    locationCache = { ok: true, coords, requireLocation: true, ts: Date.now() };
    return { ok: true, coords };
  } catch (e) {
    const err = e as GeolocationPositionError;
    if (err.code === 1) return { ok: false, error: "請允許定位權限以確認您在校園內" };
    return { ok: false, error: "無法取得定位，請稍後再試" };
  }
}

export function preloadLocation() {
  checkSchoolLocation().catch(() => {});
}

let pendingOrderRequest: Promise<{ id: string; orderNumber: string }> | null = null;

export async function createOrderSecure(data: {
  studentId: string;
  studentName: string | null;
  className: string | null;
  department: string;
  note: string | null;
  paymentMethod?: string;
  pickupDate: string | null;
  pickupTime: string | null;
  items: { menuItemId: string; name: string; quantity: number; price: number }[];
  coords?: { lat: number; lng: number } | null;
}): Promise<{ id: string; orderNumber: string }> {
  // Prevent double submission
  if (pendingOrderRequest) return pendingOrderRequest;

  pendingOrderRequest = (async () => {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "送出失敗" }));
        throw new Error(err.error || "送出失敗");
      }
      return res.json();
    } catch (err) {
      // One retry with backoff for network errors
      if (err instanceof TypeError) {
        await new Promise((r) => setTimeout(r, 1000));
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: "送出失敗" }));
          throw new Error(errBody.error || "送出失敗");
        }
        return res.json();
      }
      throw err;
    } finally {
      pendingOrderRequest = null;
    }
  })();

  return pendingOrderRequest;
}

export async function updateOrderStatusSecure(id: string, status: string) {
  const res = await fetch(`/api/orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "更新失敗" }));
    throw new Error(err.error || "更新失敗");
  }
  return res.json();
}

export async function addMenuItemSecure(data: {
  name: string;
  price: number;
  category: string;
  department: string;
  description: string | null;
  imageUrl: string | null;
  tags?: string[];
  stock?: number | null;
}) {
  const res = await fetch("/api/menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("新增失敗");
  return res.json();
}

export async function updateMenuItemSecure(id: string, data: Record<string, unknown>) {
  const res = await fetch(`/api/menu/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("更新失敗");
  return res.json();
}

export async function deleteMenuItemSecure(id: string) {
  const res = await fetch(`/api/menu/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("刪除失敗");
  return res.json();
}
