export type MenuTag = "promotion" | "seasonal" | "daily_special";

export const MENU_TAG_LABELS: Record<MenuTag, string> = {
  promotion: "促銷",
  seasonal: "季節限定",
  daily_special: "本日限定",
};

export const MENU_TAG_COLORS: Record<MenuTag, string> = {
  promotion: "bg-red-500 text-white",
  seasonal: "bg-amber-500 text-white",
  daily_special: "bg-purple-500 text-white",
};

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  department: string;
  imageUrl: string | null;
  available: boolean;
  tags: MenuTag[];
  stock: number | null; // null = unlimited
  soldOut: boolean;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  studentId: string;
  studentName: string | null;
  className: string | null;
  department: string;
  status: string;
  totalPrice: number;
  note: string | null;
  pickupDate: string | null;
  pickupTime: string | null;
  createdAt: string;
  items: {
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
}
