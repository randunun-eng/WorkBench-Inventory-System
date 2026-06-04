import { useEffect, useState } from 'react';

// Client-side cart (localStorage). Buyers can be guests, so no server state.
// Items are keyed by (catalog_item_id, shop_slug) since the same catalog
// product can be sold by multiple shops and each is a distinct line.

export interface CartItem {
  catalog_item_id: string;
  name: string;
  price: number;
  currency: string;
  shop_slug: string;
  shop_name: string;
  image?: string | null;
  qty: number;
}

const KEY = 'wb_cart';

function read(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function write(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('cart-change'));
}

export const cart = {
  get: read,
  count(): number { return read().reduce((s, i) => s + i.qty, 0); },
  total(): number { return read().reduce((s, i) => s + i.price * i.qty, 0); },
  add(item: Omit<CartItem, 'qty'>, qty = 1) {
    const items = read();
    const ex = items.find(i => i.catalog_item_id === item.catalog_item_id && i.shop_slug === item.shop_slug);
    if (ex) ex.qty += qty; else items.push({ ...item, qty });
    write(items);
  },
  setQty(catalog_item_id: string, shop_slug: string, qty: number) {
    const items = read()
      .map(i => (i.catalog_item_id === catalog_item_id && i.shop_slug === shop_slug) ? { ...i, qty } : i)
      .filter(i => i.qty > 0);
    write(items);
  },
  remove(catalog_item_id: string, shop_slug: string) {
    write(read().filter(i => !(i.catalog_item_id === catalog_item_id && i.shop_slug === shop_slug)));
  },
  clear() { write([]); },
  // Group lines by seller — each seller becomes one order at checkout.
  groupBySeller(): Record<string, { shop_name: string; items: CartItem[] }> {
    const g: Record<string, { shop_name: string; items: CartItem[] }> = {};
    for (const i of read()) {
      if (!g[i.shop_slug]) g[i.shop_slug] = { shop_name: i.shop_name, items: [] };
      g[i.shop_slug].items.push(i);
    }
    return g;
  },
};

export function useCart(): CartItem[] {
  const [items, setItems] = useState<CartItem[]>(read());
  useEffect(() => {
    const h = () => setItems(read());
    window.addEventListener('cart-change', h);
    return () => window.removeEventListener('cart-change', h);
  }, []);
  return items;
}
