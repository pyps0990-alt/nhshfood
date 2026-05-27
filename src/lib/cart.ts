import { create } from "zustand";
import type { CartItem, MenuItem } from "@/types";

interface CartState {
  department: string | null;
  items: CartItem[];
  add: (item: MenuItem, dept: string) => void;
  remove: (menuItemId: string) => void;
  updateQty: (menuItemId: string, qty: number) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

export const useCart = create<CartState>((set, get) => ({
  department: null,
  items: [],

  add: (menuItem, dept) => {
    const state = get();
    if (state.department && state.department !== dept) {
      set({ department: dept, items: [{ menuItem, quantity: 1 }] });
      return;
    }
    const existing = state.items.find((i) => i.menuItem.id === menuItem.id);
    if (existing) {
      set({
        department: dept,
        items: state.items.map((i) =>
          i.menuItem.id === menuItem.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      });
    } else {
      set({
        department: dept,
        items: [...state.items, { menuItem, quantity: 1 }],
      });
    }
  },

  remove: (menuItemId) =>
    set((s) => ({
      items: s.items.filter((i) => i.menuItem.id !== menuItemId),
      department: s.items.length <= 1 ? null : s.department,
    })),

  updateQty: (menuItemId, qty) => {
    if (qty <= 0) {
      get().remove(menuItemId);
      return;
    }
    set((s) => ({
      items: s.items.map((i) =>
        i.menuItem.id === menuItemId ? { ...i, quantity: qty } : i
      ),
    }));
  },

  clear: () => set({ items: [], department: null }),

  total: () => get().items.reduce((s, i) => s + i.menuItem.price * i.quantity, 0),

  count: () => get().items.reduce((s, i) => s + i.quantity, 0),
}));
