import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, MenuItem } from "@/types";

interface CartState {
  department: string | null;
  items: CartItem[];
  add: (item: MenuItem, dept: string) => void;
  remove: (menuItemId: string) => void;
  updateQty: (menuItemId: string, qty: number) => void;
  clear: () => void;
  clearDept: (dept: string) => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      department: null,
      items: [],

      add: (menuItem, dept) => {
        const state = get();
        const existing = state.items.find((i) => i.menuItem.id === menuItem.id && i.department === dept);
        if (existing) {
          set({
            department: dept,
            items: state.items.map((i) =>
              i.menuItem.id === menuItem.id && i.department === dept
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          });
        } else {
          set({
            department: dept,
            items: [...state.items, { menuItem, quantity: 1, department: dept }],
          });
        }
      },

      remove: (menuItemId) =>
        set((s) => {
          const newItems = s.items.filter((i) => i.menuItem.id !== menuItemId);
          return {
            items: newItems,
            department: newItems.length === 0 ? null : s.department,
          };
        }),

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

      clearDept: (dept) =>
        set((s) => {
          const newItems = s.items.filter((i) => i.department !== dept);
          return {
            items: newItems,
            department: newItems.length === 0 ? null : s.department,
          };
        }),
    }),
    {
      name: "nhsh-cart",
      partialize: (state) => ({
        department: state.department,
        items: state.items,
      }),
    }
  )
);
