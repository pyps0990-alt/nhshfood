"use client";

import { useEffect, useState, useRef } from "react";
import {
  db,
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  addDoc,
  updateDoc,
  Timestamp,
  getDocs,
} from "./firebase";
import type { MenuItem, Order } from "@/types";

// ==================== Menu (realtime + cached) ====================
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

// ==================== Orders (realtime) ====================
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

// ==================== Mutations (direct Firestore writes) ====================
export async function createOrderDirect(data: {
  studentId: string;
  studentName: string | null;
  className: string | null;
  department: string;
  note: string | null;
  pickupTime: string | null;
  items: { menuItemId: string; name: string; quantity: number; price: number }[];
}) {
  const totalPrice = data.items.reduce((s, i) => s + i.price * i.quantity, 0);

  // Get today's order count for order number
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = Timestamp.fromDate(today);

  const q = query(
    collection(db, "orders"),
    where("createdAt", ">=", todayStart)
  );
  const snap = await getDocs(q);
  const orderNumber = snap.size + 1;

  const ref = await addDoc(collection(db, "orders"), {
    ...data,
    totalPrice,
    status: "pending",
    orderNumber,
    createdAt: Timestamp.now(),
  });

  return { id: ref.id, orderNumber };
}

export async function updateOrderStatusDirect(id: string, status: string) {
  await updateDoc(doc(db, "orders", id), { status });
}

export async function addMenuItemDirect(data: {
  name: string;
  price: number;
  category: string;
  department: string;
  description: string | null;
  imageUrl: string | null;
}) {
  const ref = await addDoc(collection(db, "menuItems"), {
    ...data,
    available: true,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateMenuItemDirect(id: string, data: Record<string, unknown>) {
  await updateDoc(doc(db, "menuItems", id), data);
}
