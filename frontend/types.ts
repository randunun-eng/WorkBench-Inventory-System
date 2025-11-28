export interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

export interface ProductSpec {
  label: string;
  value: string | number;
}

export interface Product {
  id: string;
  shopId: string; // Link to the specific shop
  shopName?: string; // Shop display name
  name: string;
  description: string;
  categoryId: string;
  price: number | null; // Null implies "Contact for Price"
  currency: string;
  stockQty: number;
  minOrderQty: number;
  image: string; // URL
  datasheet?: string; // URL
  specs: ProductSpec[];
  isHot: boolean; // For "Hot Selling" badges
}

export interface ShopProfile {
  id: string;
  name: string;
  slug: string;
  description: string;
  rating: number;
  totalSales: number;
  contact: {
    phone: string;
    email: string;
    address: string;
  };
  verified: boolean;
}