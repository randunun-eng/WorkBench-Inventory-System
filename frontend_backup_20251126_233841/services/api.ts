import { Product, ShopProfile, Category } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

// Storage keys
const TOKEN_KEY = 'workbench_auth_token';
const USER_KEY = 'workbench_user';

// Helper to get auth token
export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

// Helper to set auth token
export const setAuthToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

// Helper to clear auth data
export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Helper to get current user
export const getCurrentUser = (): any | null => {
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

// Helper to set current user
export const setCurrentUser = (user: any) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// Helper for making authenticated requests
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuth();
    throw new Error('Unauthorized');
  }

  return response;
};

// Auth API
export const authAPI = {
  async signup(email: string, password: string, shopName: string) {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, shop_name: shopName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }

    const data = await response.json();
    setAuthToken(data.token);
    setCurrentUser(data.user);
    return data;
  },

  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setAuthToken(data.token);
    setCurrentUser(data.user);
    return data;
  },

  logout() {
    clearAuth();
  },

  isAuthenticated(): boolean {
    return !!getAuthToken();
  },
};

// Search API
export const searchAPI = {
  async search(query: string, limit = 20, offset = 0): Promise<Product[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const results = await response.json();

    // Transform backend format to frontend format
    return results.map((item: any) => ({
      id: item.id,
      shopId: item.shop_slug || '',
      name: item.name,
      description: item.description || '',
      categoryId: '', // Backend doesn't return category in search
      price: item.price,
      currency: item.currency || 'LKR',
      stockQty: item.stock_qty || 0,
      minOrderQty: 1,
      image: item.primary_image_r2_key
        ? `${API_BASE_URL}/api/upload/public/${item.primary_image_r2_key}`
        : 'https://picsum.photos/400/400?random=' + item.id,
      isHot: false,
      specs: [],
      shopName: item.shop_name,
    }));
  },
};

// Shop API
export const shopAPI = {
  async getShopBySlug(slug: string): Promise<{ shop: ShopProfile; inventory: Product[] }> {
    const response = await fetch(`${API_BASE_URL}/api/shop/${slug}`);

    if (!response.ok) {
      throw new Error('Failed to fetch shop');
    }

    const data = await response.json();

    // Transform shop data
    const shop: ShopProfile = {
      id: data.shop.id,
      name: data.shop.shop_name,
      slug: data.shop.shop_slug,
      description: data.shop.public_contact_info?.description || '',
      rating: 0, // Backend doesn't have ratings yet
      totalSales: 0,
      verified: true,
      contact: {
        phone: data.shop.public_contact_info?.phone || '',
        email: data.shop.public_contact_info?.email || '',
        address: data.shop.location_address || '',
      },
    };

    // Transform inventory items
    const inventory: Product[] = data.inventory.map((item: any) => ({
      id: item.id,
      shopId: data.shop.shop_slug,
      name: item.name,
      description: item.description || '',
      categoryId: '', // Backend doesn't return category
      price: item.price,
      currency: item.currency || 'LKR',
      stockQty: item.stock_qty || 0,
      minOrderQty: 1,
      image: item.primary_image_r2_key
        ? `${API_BASE_URL}/api/upload/public/${item.primary_image_r2_key}`
        : 'https://picsum.photos/400/400?random=' + item.id,
      isHot: false,
      specs: item.specifications || [],
    }));

    return { shop, inventory };
  },

  // Get all shops (we'll need to create this endpoint or use a workaround)
  async getAllShops(): Promise<ShopProfile[]> {
    // For now, return empty array - we'll need to add this endpoint to backend
    // Or we can search for a common term to discover shops
    return [];
  },
};

// Inventory API (protected)
export const inventoryAPI = {
  async getMyInventory(limit = 20, offset = 0): Promise<Product[]> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/inventory?limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch inventory');
    }

    const items = await response.json();

    return items.map((item: any) => ({
      id: item.id,
      shopId: '', // Current user's shop
      name: item.name,
      description: item.description || '',
      categoryId: item.category_id || '',
      price: item.price,
      currency: item.currency || 'LKR',
      stockQty: item.stock_qty || 0,
      minOrderQty: 1,
      image: item.primary_image_r2_key
        ? `${API_BASE_URL}/api/upload/public/${item.primary_image_r2_key}`
        : 'https://picsum.photos/400/400?random=' + item.id,
      isHot: false,
      specs: item.specifications || [],
    }));
  },

  async getItem(id: string): Promise<Product> {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/inventory/${id}`);

    if (!response.ok) {
      throw new Error('Failed to fetch item');
    }

    const item = await response.json();

    return {
      id: item.id,
      shopId: '',
      name: item.name,
      description: item.description || '',
      categoryId: item.category_id || '',
      price: item.price,
      currency: item.currency || 'LKR',
      stockQty: item.stock_qty || 0,
      minOrderQty: 1,
      image: item.primary_image_r2_key
        ? `${API_BASE_URL}/api/upload/public/${item.primary_image_r2_key}`
        : 'https://picsum.photos/400/400?random=' + item.id,
      isHot: false,
      specs: item.specifications || [],
    };
  },

  async createItem(item: Partial<Product>) {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/inventory`, {
      method: 'POST',
      body: JSON.stringify({
        name: item.name,
        description: item.description,
        category_id: item.categoryId,
        price: item.price,
        stock_qty: item.stockQty,
        specifications: item.specs,
        is_public: true,
        is_visible_to_network: true,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create item');
    }

    return response.json();
  },

  async updateItem(id: string, updates: Partial<Product>) {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: updates.name,
        description: updates.description,
        price: updates.price,
        stock_qty: updates.stockQty,
        specifications: updates.specs,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update item');
    }

    return response.json();
  },

  async deleteItem(id: string) {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/inventory/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete item');
    }

    return response.json();
  },
};

// Categories - For now we'll keep using static categories
// since the backend doesn't have a categories endpoint yet
export const STATIC_CATEGORIES: Category[] = [
  {
    id: 'cat_1',
    name: 'Switch Gears',
    slug: 'switch-gears',
    children: [
      { id: 'cat_1_1', name: 'MCB (AC)', slug: 'mcb-ac' },
      { id: 'cat_1_2', name: 'MCCB', slug: 'mccb' },
      { id: 'cat_1_3', name: 'Contactors', slug: 'contactors' },
    ]
  },
  {
    id: 'cat_2',
    name: 'Semiconductors',
    slug: 'semiconductors',
    children: [
      { id: 'cat_2_1', name: 'IGBT Modules', slug: 'igbt' },
      { id: 'cat_2_2', name: 'MOSFETs', slug: 'mosfets' },
      { id: 'cat_2_3', name: 'Diodes', slug: 'diodes' },
    ]
  },
  {
    id: 'cat_3',
    name: 'Solar Equipment',
    slug: 'solar',
    children: [
      { id: 'cat_3_1', name: 'Inverters', slug: 'inverters' },
      { id: 'cat_3_2', name: 'MPPT Controllers', slug: 'mppt' },
    ]
  },
  {
    id: 'cat_4',
    name: 'EV Infrastructure',
    slug: 'ev-infra',
    children: [
      { id: 'cat_4_1', name: 'Chargers', slug: 'chargers' },
      { id: 'cat_4_2', name: 'Connectors', slug: 'connectors' },
    ]
  },
  {
    id: 'cat_5',
    name: 'Passive Components',
    slug: 'passive',
    children: [
      { id: 'cat_5_1', name: 'Capacitors', slug: 'capacitors' },
      { id: 'cat_5_2', name: 'Resistors', slug: 'resistors' },
    ]
  }
];
