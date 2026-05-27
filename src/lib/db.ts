import {
  db,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  type QueryConstraint,
} from "./firebase";

// ==================== Menu ====================
export interface MenuItemData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  department: string;
  imageUrl: string | null;
  available: boolean;
  createdAt: Date;
}

export async function getMenuItems(department?: string, includeAll = false) {
  // Simple query - filter in JS to avoid composite index requirements
  const q = department
    ? query(collection(db, "menuItems"), where("department", "==", department))
    : query(collection(db, "menuItems"));

  const snap = await getDocs(q);
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItemData));

  if (!includeAll) {
    items = items.filter((i) => i.available);
  }

  // Sort by category in JS
  items.sort((a, b) => (a.category || "").localeCompare(b.category || ""));

  return items;
}

export async function addMenuItem(data: Omit<MenuItemData, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, "menuItems"), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateMenuItem(id: string, data: Partial<MenuItemData>) {
  await updateDoc(doc(db, "menuItems", id), data as Record<string, unknown>);
}

// ==================== Orders ====================
export interface OrderItemData {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderData {
  id: string;
  orderNumber: number;
  studentId: string;
  studentName: string | null;
  className: string | null;
  department: string;
  status: string;
  totalPrice: number;
  note: string | null;
  pickupTime: string | null;
  items: OrderItemData[];
  createdAt: Date;
}

export async function createOrder(data: Omit<OrderData, "id" | "orderNumber" | "createdAt">) {
  // Generate order number (today's count + 1)
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
    orderNumber,
    createdAt: Timestamp.now(),
  });
  return { id: ref.id, orderNumber };
}

export async function getOrder(id: string): Promise<OrderData | null> {
  const snap = await getDoc(doc(db, "orders", id));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    ...d,
    createdAt: d.createdAt?.toDate?.() ?? new Date(),
  } as OrderData;
}

export async function getOrders(department?: string, status?: string) {
  // Simple query to avoid composite index - filter & sort in JS
  const constraints: QueryConstraint[] = [];
  if (department) constraints.push(where("department", "==", department));

  const q = query(collection(db, "orders"), ...constraints);
  const snap = await getDocs(q);
  let orders = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
    } as OrderData;
  });

  // Filter by status in JS
  if (status) {
    orders = orders.filter((o) => o.status === status);
  }

  // Sort by createdAt desc in JS
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return orders;
}

export async function updateOrderStatus(id: string, status: string) {
  await updateDoc(doc(db, "orders", id), { status });
}

// ==================== Realtime ====================
export function subscribeToOrders(
  department: string,
  callback: (orders: OrderData[]) => void
) {
  const q = query(
    collection(db, "orders"),
    where("department", "==", department)
  );
  return onSnapshot(q, (snap) => {
    const orders = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
      } as OrderData;
    });
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(orders);
  });
}
