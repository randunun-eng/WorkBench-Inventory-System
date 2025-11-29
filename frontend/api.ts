// API Service for WorkBench Inventory

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://workbench-inventory.randunun.workers.dev';

export interface APIProduct {
  id: string;
  name: string;
  description: string;
  price: number | null;
  currency: string;
  primary_image_r2_key: string | null;
  datasheet_r2_key: string | null;
  shop_name: string;
  shop_slug: string;
  specifications?: any[];
  stock_qty?: number;
}

export interface APIShop {
  id: string;
  shop_name: string;
  shop_slug: string;
  public_contact_info: any;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  logo_r2_key: string | null;
}

export const api = {
  // Search products (empty query returns all products)
  async searchProducts(query: string = '', limit: number = 100): Promise<APIProduct[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return await response.json();
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  },

  // Get all categories (public)
  async getCategories(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      return await response.json();
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  // Get all shops
  async getAllShops(): Promise<APIShop[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/shop`);
      if (!response.ok) throw new Error('Failed to fetch shops');
      return await response.json();
    } catch (error) {
      console.error('Error fetching shops:', error);
      return [];
    }
  },

  // Get shop by slug
  async getShopBySlug(slug: string): Promise<{ shop: APIShop; inventory: APIProduct[] } | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/shop/${slug}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching shop:', error);
      return null;
    }
  },

  // Get product by ID
  async getProductById(id: string): Promise<APIProduct | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/search/product/${id}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  },

  // --- Private API (Requires Auth) ---

  token: localStorage.getItem('auth_token'),

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    window.dispatchEvent(new Event('auth-change'));
  },

  setUser(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
    window.dispatchEvent(new Event('auth-change'));
  },

  logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
  },

  async login(email: string, password: string): Promise<{ token: string; user: any } | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) throw new Error('Login failed');
      const data = await response.json();
      this.setToken(data.token);
      this.setUser(data.user);
      return data;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  },

  async signup(email: string, password: string, shop_name: string): Promise<{ token: string; user: any } | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, shop_name })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Signup failed');
      }

      const data = await response.json();
      this.setToken(data.token);
      this.setUser(data.user);
      return data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error; // Re-throw to handle in UI
    }
  },

  async getInventory(): Promise<APIProduct[]> {
    if (!this.token) return [];
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch inventory');
      return await response.json();
    } catch (error) {
      console.error('Fetch inventory error:', error);
      return [];
    }
  },

  async createItem(item: any): Promise<any> {
    if (!this.token) throw new Error('Not authenticated');
    const response = await fetch(`${API_BASE_URL}/api/inventory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error('Failed to create item');
    return await response.json();
  },

  async updateItem(id: string, updates: any): Promise<any> {
    if (!this.token) throw new Error('Not authenticated');
    const response = await fetch(`${API_BASE_URL}/api/inventory/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update item');
    return await response.json();
  },

  async deleteItem(id: string): Promise<any> {
    if (!this.token) throw new Error('Not authenticated');
    const response = await fetch(`${API_BASE_URL}/api/inventory/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    if (!response.ok) throw new Error('Failed to delete item');
    return await response.json();
  },

  async adjustStock(id: string, change_amount: number, reason: string): Promise<any> {
    if (!this.token) throw new Error('Not authenticated');
    const response = await fetch(`${API_BASE_URL}/api/inventory/${id}/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ change_amount, reason })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw { message: errorData.error || 'Failed to adjust stock', details: errorData.details };
    }
    return await response.json();
  },

  async getInventoryLogs(id: string): Promise<any[]> {
    if (!this.token) return [];
    const response = await fetch(`${API_BASE_URL}/api/inventory/${id}/logs`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch logs');
    return await response.json();
  },

  async uploadImage(file: File, isPrivate: boolean = false): Promise<{ key: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isPrivate', isPrivate.toString());

    let endpoint = `${API_BASE_URL}/api/upload/proxy`;
    const headers: any = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else {
      // Guest Upload
      endpoint = `${API_BASE_URL}/api/upload/guest`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) throw new Error('Failed to upload file');
    const data = await response.json();
    return { key: data.key, url: this.getImageUrl(data.key) };
  },

  async searchNetwork(query: string): Promise<any[]> {
    if (!this.token) return [];
    try {
      const response = await fetch(`${API_BASE_URL}/api/network/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (!response.ok) throw new Error('Failed to search network');
      return await response.json();
    } catch (error) {
      console.error('Network search error:', error);
      return [];
    }
  },

  async parseDatasheet(file: File): Promise<any> {
    if (!this.token) throw new Error('Not authenticated');

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/api/ai/ocr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
        // Content-Type is automatically set with boundary for FormData
      },
      body: formData
    });

    if (!response.ok) throw new Error('Failed to parse datasheet');
    return await response.json();
  },

  async uploadDatasheet(file: File, isPrivate: boolean = false): Promise<{ key: string; extractedSpecs: any }> {
    if (!this.token) throw new Error('Not authenticated');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('isPrivate', isPrivate.toString());
    formData.append('isDatasheet', 'true');

    const response = await fetch(`${API_BASE_URL}/api/upload/proxy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });

    if (!response.ok) throw new Error('Failed to upload datasheet');
    return await response.json();
  },

  async chatWithAI(messages: any[]): Promise<any> {
    const headers: any = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages })
    });

    if (!response.ok) throw new Error('Failed to chat with AI');
    return await response.json();
  },

  async identifyComponent(file: File): Promise<any> {
    if (!this.token) throw new Error('Not authenticated');

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/api/vision/identify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });

    if (!response.ok) throw new Error('Failed to identify component');
    return await response.json();
  },

  async generateSpecs(productName: string): Promise<any> {
    if (!this.token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/api/ai/generate-specs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ productName })
    });

    if (!response.ok) throw new Error('Failed to generate specifications');
    return await response.json();
  },

  // --- Admin API ---
  async getUsers(): Promise<any[]> {
    if (!this.token) throw new Error('Not authenticated');
    const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return await response.json();
  },

  async approveUser(id: string, approved: boolean): Promise<any> {
    if (!this.token) throw new Error('Not authenticated');
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ approved })
    });
    if (!response.ok) throw new Error('Failed to update approval status');
    return await response.json();
  },

  async toggleUserStatus(id: string, active: boolean): Promise<any> {
    if (!this.token) throw new Error('Not authenticated');
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ active })
    });
    if (!response.ok) throw new Error('Failed to update status');
    return await response.json();
  },

  async approvePasswordReset(userId: string): Promise<{ success: boolean; token: string }> {
    if (!this.token) throw new Error('Not authenticated');
    const response = await fetch(`${API_BASE_URL}/api/admin/users/reset-password-approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ userId })
    });
    if (!response.ok) throw new Error('Failed to approve password reset');
    return await response.json();
  },

  async adminResetPassword(userId: string, newPassword: string): Promise<any> {
    if (!this.token) throw new Error('Not authenticated');
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/reset-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ newPassword })
    });
    if (!response.ok) throw new Error('Failed to reset password');
    return await response.json();
  },

  // --- Shop Profile API ---
  async updateShopProfile(data: any): Promise<any> {
    if (!this.token) throw new Error('Not authenticated');
    const response = await fetch(`${API_BASE_URL}/api/shop/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return await response.json();
  },

  // --- Public Password Reset API ---
  async requestPasswordReset(email: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/request-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return await response.json();
  },

  async resetPassword(data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reset password');
    }
    return await response.json();
  },

  getImageUrl(key: string | null): string {
    if (!key) return 'https://via.placeholder.com/300?text=No+Image';
    if (key.startsWith('http')) return key;
    return `${API_BASE_URL}/api/images/${key}`;
  }
};
