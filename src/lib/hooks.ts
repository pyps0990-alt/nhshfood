"use client";

import { useEffect, useMemo, useState } from "react";
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

// ==================== Orders (admin feed) ====================
// Polls the admin-authenticated /api/orders endpoint. The client SDK can no
// longer list orders (Firestore rules deny it), which closes a data leak.
// One shared poller per department so POS / receiver / dashboard tabs don't
// multiply requests.

type OrdersListener = (orders: Order[], error: string | null) => void;
const orderFeeds = new Map<string, { listeners: Set<OrdersListener>; timer: ReturnType<typeof setTimeout> | null; last: Order[] | null; etag: string }>();
const ORDER_POLL_MS = 3000;

function startOrderFeed(department: string) {
  const feed = orderFeeds.get(department)!;
  const tick = async () => {
    if (!orderFeeds.has(department)) return;
    if (typeof document !== "undefined" && document.hidden) {
      feed.timer = setTimeout(tick, ORDER_POLL_MS * 3);
      return;
    }
    try {
      const res = await fetch(`/api/orders?department=${encodeURIComponent(department)}`, { cache: "no-store" });
      if (res.status === 401) {
        feed.listeners.forEach((l) => l(feed.last || [], "unauthorized"));
        if (typeof window !== "undefined") window.location.href = "/admin/login";
        return;
      }
      if (res.ok) {
        const text = await res.text();
        if (text !== feed.etag) {
          feed.etag = text;
          feed.last = JSON.parse(text) as Order[];
          feed.listeners.forEach((l) => l(feed.last!, null));
        }
      }
    } catch {
      feed.listeners.forEach((l) => l(feed.last || [], "network"));
    }
    if (orderFeeds.has(department)) feed.timer = setTimeout(tick, ORDER_POLL_MS);
  };
  tick();
}

export function useOrders(department: string, filterStatus?: string) {
  const [all, setAll] = useState<Order[] | null>(() => orderFeeds.get(department)?.last ?? null);

  useEffect(() => {
    let feed = orderFeeds.get(department);
    const listener: OrdersListener = (o) => setAll(o);
    if (!feed) {
      feed = { listeners: new Set([listener]), timer: null, last: null, etag: "" };
      orderFeeds.set(department, feed);
      startOrderFeed(department);
    } else {
      feed.listeners.add(listener);
    }
    return () => {
      const f = orderFeeds.get(department);
      if (!f) return;
      f.listeners.delete(listener);
      if (f.listeners.size === 0) {
        if (f.timer) clearTimeout(f.timer);
        orderFeeds.delete(department);
      }
    };
  }, [department]);

  const orders = useMemo(() => {
    if (!all) return [];
    return filterStatus && filterStatus !== "all" ? all.filter((o) => o.status === filterStatus) : all;
  }, [all, filterStatus]);

  return { orders, loading: all === null };
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

let pendingOrderRequest: Promise<CreateOrderResult> | null = null;

export interface CreateOrderResult {
  id: string;
  orderNumber: string;
  totalPrice?: number;
  status?: string;
  /** Present for online payment: navigate here to hand off to ECPay. */
  redirectUrl?: string | null;
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function createOrderSecure(data: {
  studentId?: string;
  studentName?: string | null;
  className?: string | null;
  department: string;
  note: string | null;
  paymentMethod?: string;
  pickupDate: string | null;
  pickupTime: string | null;
  items: { menuItemId: string; name: string; quantity: number; price: number }[];
  coords?: { lat: number; lng: number } | null;
  pos?: boolean;
}): Promise<CreateOrderResult> {
  // Prevent double submission from the same tab.
  if (pendingOrderRequest) return pendingOrderRequest;

  // Same key for the retry below → the server returns the same order instead
  // of creating a duplicate (and double-charging the wallet).
  const body = JSON.stringify({ ...data, idempotencyKey: newIdempotencyKey() });

  const send = async () => {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "送出失敗" }));
      throw new Error(err.error || "送出失敗");
    }
    return res.json() as Promise<CreateOrderResult>;
  };

  pendingOrderRequest = (async () => {
    try {
      return await send();
    } catch (err) {
      if (err instanceof TypeError) {
        await new Promise((r) => setTimeout(r, 1000));
        return send();
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
