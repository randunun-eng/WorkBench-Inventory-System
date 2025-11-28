// API Client for WorkBench Storefront
import type { Product, ShopProfile, Category } from '../types/storefront';

const API_URL = import.meta.env.VITE_API_URL || 'https://workbench-inventory.randunun.workers.dev';

// Backend API response types
interface BackendItem {
  id: string;
  name: string;
  description: string;
  specifications: string | { [key: string]: any };
  price: number;
  currency: string;
  primary_image_r2_key: string | null;
  stock_qty: number;
  user_id: string;
  category_id?: string;
}

interface BackendShop {
  id: string;
  shop_name: string;
  shop_slug: string;
  public_contact_info: string | {
    phone?: string;
    email?: string;
    address?: string;
  };
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
}

interface ShopResponse {
  shop: BackendShop;
  inventory: BackendItem[];
}

// Helper function to convert backend item to storefront product
function convertBackendItemToProduct(item: BackendItem, shopId: string): Product {
  // Parse specifications if it's a string
  let specs: any = {};
  if (typeof item.specifications === 'string') {
    try {
      specs = JSON.parse(item.specifications);
    } catch {
      specs = {};
    }
  } else {
    specs = item.specifications || {};
  }

  // Convert specifications object to array format
  const specsArray = Object.entries(specs).map(([key, value]) => ({
    label: key,
    value: value as string | number
  }));

  // Generate image URL from R2 key
  const imageUrl = item.primary_image_r2_key
    ? `${API_URL}/api/images/${item.primary_image_r2_key}`
    : 'https://via.placeholder.com/300?text=No+Image';

  return {
    id: item.id,
    shopId: shopId,
    name: item.name,
    description: item.description || '',
    categoryId: item.category_id || 'cat_unknown',
    price: item.price || null,
    currency: item.currency || 'LKR',
    stockQty: item.stock_qty || 0,
    minOrderQty: 1,
    image: imageUrl,
    specs: specsArray,
    isHot: false
  };
}

// Helper function to convert backend shop to storefront shop profile
function convertBackendShopToProfile(shop: BackendShop): ShopProfile {
  // Parse contact info if it's a string
  let contactInfo: any = {};
  if (typeof shop.public_contact_info === 'string') {
    try {
      contactInfo = JSON.parse(shop.public_contact_info);
    } catch {
      contactInfo = {};
    }
  } else {
    contactInfo = shop.public_contact_info || {};
  }

  return {
    id: shop.id,
    name: shop.shop_name || 'Unknown Shop',
    slug: shop.shop_slug || '',
    description: '',
    rating: 4.5,
    totalSales: 0,
    verified: true,
    contact: {
      phone: contactInfo.phone || '',
      email: contactInfo.email || '',
      address: shop.location_address || contactInfo.address || ''
    }
  };
}

export const storefrontApi = {
  // Get shop by slug
  async getShopBySlug(slug: string): Promise<{ shop: ShopProfile; products: Product[] }> {
    try {
      const response = await fetch(`${API_URL}/api/shop/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch shop');

      const data: ShopResponse = await response.json();

      const shop = convertBackendShopToProfile(data.shop);
      const products = data.inventory.map(item =>
        convertBackendItemToProduct(item, data.shop.id)
      );

      return { shop, products };
    } catch (error) {
      console.error('Error fetching shop:', error);
      throw error;
    }
  },

  // Get all shops (this would need a new backend endpoint)
  async getAllShops(): Promise<ShopProfile[]> {
    try {
      // This endpoint doesn't exist yet in the backend, so we'll return empty for now
      // TODO: Add /api/shops endpoint to backend
      return [];
    } catch (error) {
      console.error('Error fetching shops:', error);
      return [];
    }
  },

  // Get categories (placeholder - would need backend implementation)
  async getCategories(): Promise<Category[]> {
    try {
      // This endpoint doesn't exist yet in the backend
      // TODO: Add /api/categories endpoint to backend
      return [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  // Get product by ID (across all shops)
  async getProductById(_id: string): Promise<{ product: Product; shop: ShopProfile } | null> {
    try {
      // This would need a new backend endpoint: /api/products/:id with shop info
      // For now, this is a placeholder
      // TODO: Add /api/products/:id endpoint to backend
      return null;
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }
};
