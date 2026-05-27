export interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
  department: string;
  imageUrl: string | null;
  available: boolean;
  availableFrom: string | null;
  availableTo: string | null;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface Order {
  id: number;
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
    id: number;
    quantity: number;
    price: number;
    menuItem: MenuItem;
  }[];
}
