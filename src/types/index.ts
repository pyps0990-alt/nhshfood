export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  department: string;
  imageUrl: string | null;
  available: boolean;
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
  pickupTime: string | null;
  createdAt: string;
  items: {
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
}
