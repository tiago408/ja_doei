export interface UserDocument {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date | any;
  updatedAt: Date | any;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isActive: boolean;
}

export interface ProductDocument {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageURL?: string;
  stock: number;
  createdAt: Date | any;
  updatedAt: Date | any;
  isActive: boolean;
}

export interface OrderDocument {
  id: string;
  userId: string;
  products: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date | any;
  updatedAt: Date | any;
  deliveryAddress?: string;
  notes?: string;
}
