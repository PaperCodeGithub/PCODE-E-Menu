import type { Timestamp } from "firebase/firestore";

export interface Category {
  id: string;
  name: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  image?: string;
}

export interface OrderItem extends MenuItem {
  quantity: number;
}

export interface RestaurantProfile {
  name: string;
  logo: string;
  location: string;
  country: string;
  currency: {
    code: string;
    symbol: string;
  };
}

export type OrderStatus = 'Received' | 'Ongoing' | 'Finishing' | 'On the Way' | 'Served' | 'Canceled';

export interface Order {
    id: string;
    restaurantId: string;
    items: OrderItem[];
    total: number;
    tableNumber: string;
    status: OrderStatus;
    createdAt: Timestamp;
}
