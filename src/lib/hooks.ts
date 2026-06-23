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
const MENU_CACHE_TTL = 30_000; // 30 seconds

export function useMenuItems(department: string) {
  const cached = menuCache.get(department);
  const [items, setItems] = useState<MenuItem[]>(cached?.items || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    const key = `menu-${department}`;
    const unsub = listenerManager.subscribe(
      key,
      "menuItems",
      [where("department", "==", department)],
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as MenuItem))
          .filter((i) => i.available)
          .sort((a, b) => (a.category || "").localeCompare(b.category || ""));
        menuCache.set(department, { items: data, fetchTime: Date.now() });
        setItems(data);
        setLoading(false);
      }
    );
    return unsub;
  }, [department]);

  return { items, loading };
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
    // Single-field query to avoid composite index requirement
    // Filter by date and status in JS
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, "orders"),
      where("department", "==", department)
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
      // Filter to today's orders only (in JS to avoid composite index)
      data = data.filter((o) => new Date(o.createdAt) >= todayStart);
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
let pendingOrderRequest: Promise<{ id: string; orderNumber: string }> | null = null;

export async function createOrderSecure(data: {
  studentId: string;
  studentName: string | null;
  className: string | null;
  department: string;
  note: string | null;
  pickupDate: string | null;
  pickupTime: string | null;
  items: { menuItemId: string; name: string; quantity: number; price: number }[];
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
