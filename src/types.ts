export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  images?: string[];
  stock: number;
  featured?: boolean;
  createdAt?: any;
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type UserProfile = {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  address?: Address;
  role: 'customer' | 'admin';
  createdAt?: any;
};

export type Address = {
  fullName: string;
  phone: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
};

export type Order = {
  id: string;
  userId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl: string;
  }[];
  shippingAddress: Address;
  locationCoordinates?: {
    latitude: number;
    longitude: number;
  };
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'UPI' | 'Card' | 'COD' | 'NetBanking';
  paymentStatus: 'pending' | 'confirmed' | 'failed';
  orderStatus: 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: any;
  paymentDetails?: {
    transactionId?: string;
    upiId?: string;
    cardNumber?: string;
  };
};

export type StoreSettings = {
  cgstPercent: number;
  sgstPercent: number;
  deliveryCharge: number;
  freeShippingThreshold: number;
  promoBannerActive?: boolean;
  promoBannerTextActive?: boolean;
  promoBannerImageActive?: boolean;
  promoBannerImageOverlayTextActive?: boolean;
  promoBannerText?: string;
  promoBannerType?: 'text' | 'image';
  promoBannerImageUrl?: string;
  promoBannerLinkUrl?: string;
  promoBannerTextSize?: 'xs' | 'sm' | 'md' | 'lg';
  promoBannerTextColor?: string;
  promoBannerBgColor?: string;
  promoBannerOverlayOpacity?: number;
  promoBannerScrollEnabled?: boolean;
  promoBannerScrollDirection?: 'left-to-right' | 'right-to-left';
  promoBannerScrollSpeed?: 'slow' | 'medium' | 'fast';
};

