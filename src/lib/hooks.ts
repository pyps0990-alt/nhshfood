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
import type { MenuItem, Order } from "@/types";

// ==================== Menu (realtime client-side reads, cached) ====================
const menuCache = new Map<string, MenuItem[]>();

export function useMenuItems(department: string) {
  const [items, setItems] = useState<MenuItem[]>(menuCache.get(department) || []);
  const [loading, setLoading] = useState(!menuCache.has(department));

  useEffect(() => {
    const q = query(
      collection(db, "menuItems"),
      where("department", "==", department)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as MenuItem))
        .filter((i) => i.available)
        .sort((a, b) => (a.category || "").localeCompare(b.category || ""));
      menuCache.set(department, data);
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, [department]);

  return { items, loading };
}

export function useAllMenuItems(department: string) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "menuItems"),
      where("department", "==", department)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as MenuItem))
        .sort((a, b) => (a.category || "").localeCompare(b.category || ""));
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, [department]);

  return { items, loading };
}

// ==================== Orders (realtime client-side reads) ====================
export function useOrders(department: string, filterStatus?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("department", "==", department)
    );
    const unsub = onSnapshot(q, (snap) => {
      let data = snap.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          ...raw,
          createdAt: raw.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
        } as Order;
      });
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

export async function createOrderSecure(data: {
  studentId: string;
  studentName: string | null;
  className: string | null;
  department: string;
  note: string | null;
  pickupTime: string | null;
  items: { menuItemId: string; name: string; quantity: number; price: number }[];
}) {
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
