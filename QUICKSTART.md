# Quick Start Guide - WorkBench Inventory System

## 🚀 Your System is Live!

**Production URL**: https://workbench-inventory.randunun.workers.dev

---

## Step 1: Create Your First Shop

1. Visit: https://workbench-inventory.randunun.workers.dev/join

2. Fill in your shop details:
   - **Shop Name**: e.g., "ElectroFix Components"
   - **Contact Person**: Your name
   - **Email**: Your email address
   - **Password**: Choose a secure password (min 6 characters)
   - **Phone**: Your contact number
   - **City**: Your location

3. Click "Submit Request"

4. You'll be logged in automatically!

---

## Step 2: Add Your First Product (via API)

### Using cURL:

```bash
# Replace with your actual email and password
curl -X POST https://workbench-inventory.randunun.workers.dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }' | jq .
```

This will return a token. Copy it and use it in the next request:

```bash
# Replace YOUR_TOKEN_HERE with the token from above
curl -X POST https://workbench-inventory.randunun.workers.dev/api/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Schneider C32 Single Pole MCB",
    "description": "High quality miniature circuit breaker for domestic and industrial use",
    "category_id": "1",
    "price": 1350.00,
    "stock_qty": 500,
    "specifications": [
      {"label": "Poles", "value": "1"},
      {"label": "Amperage", "value": "32A"},
      {"label": "Voltage", "value": "230V AC"},
      {"label": "Breaking Capacity", "value": "6kA"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' | jq .
```

---

## Step 3: Add Multiple Sample Products

Here's a script to add several products at once:

```bash
#!/bin/bash

# First, login and get token
TOKEN=$(curl -s -X POST https://workbench-inventory.randunun.workers.dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }' | jq -r '.token')

echo "Token: $TOKEN"

# Product 1: MCB
curl -X POST https://workbench-inventory.randunun.workers.dev/api/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Schneider C32 Single Pole MCB",
    "description": "High quality miniature circuit breaker",
    "category_id": "1",
    "price": 1350.00,
    "stock_qty": 500,
    "specifications": [
      {"label": "Poles", "value": "1"},
      {"label": "Amperage", "value": "32A"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }'

# Product 2: IGBT Module
curl -X POST https://workbench-inventory.randunun.workers.dev/api/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Infineon IGBT Module 1200V 100A",
    "description": "High power IGBT module suitable for motor drives",
    "category_id": "2",
    "price": 13500.00,
    "stock_qty": 25,
    "specifications": [
      {"label": "Vces", "value": "1200V"},
      {"label": "Ic", "value": "100A"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }'

# Product 3: Solar Inverter
curl -X POST https://workbench-inventory.randunun.workers.dev/api/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "5kW Hybrid Solar Inverter 48V",
    "description": "Pure sine wave inverter with built-in MPPT",
    "category_id": "3",
    "price": 75000.00,
    "stock_qty": 5,
    "specifications": [
      {"label": "Power", "value": "5000W"},
      {"label": "Battery Voltage", "value": "48V"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }'

echo "Products added successfully!"
```

Save this as `add_products.sh`, make it executable (`chmod +x add_products.sh`), and run it.

---

## Step 4: View Your Products

### On the Website:
Visit: https://workbench-inventory.randunun.workers.dev/

Your products should now appear on the storefront!

### Via API:
```bash
# Search for products
curl "https://workbench-inventory.randunun.workers.dev/api/search?q=schneider" | jq .

# View your shop's products
curl "https://workbench-inventory.randunun.workers.dev/api/shop/your-shop-slug" | jq .
```

---

## Step 5: Test All Features

### 1. Browse Products
- Visit the homepage
- Click on different categories
- Filter by shop

### 2. View Product Details
- Click on any product
- View specifications
- See shop information

### 3. Search
- Use the search bar (when implemented)
- Or test via API: `/api/search?q=<query>`

### 4. Chat (when available)
- Navigate to chat features
- Test real-time messaging

---

## Common Tasks

### Update a Product
```bash
# Get product ID from your inventory listing first
PRODUCT_ID="your-product-id"

curl -X PUT https://workbench-inventory.randunun.workers.dev/api/inventory/$PRODUCT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "price": 1500.00,
    "stock_qty": 450
  }' | jq .
```

### Delete a Product
```bash
curl -X DELETE https://workbench-inventory.randunun.workers.dev/api/inventory/$PRODUCT_ID \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### List Your Inventory
```bash
curl https://workbench-inventory.randunun.workers.dev/api/inventory \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Development Workflow

### Make Changes Locally
```bash
# 1. Make your changes to the code

# 2. Test locally
npm run dev  # Backend runs on localhost:8787

# In another terminal:
cd frontend
npm run dev  # Frontend runs on localhost:3000

# 3. When satisfied, build and deploy
cd ..
cd frontend && npm run build && cd ..
wrangler deploy
```

---

## Monitoring & Logs

### View Real-time Logs
```bash
wrangler tail
```

### Check Deployment Status
```bash
wrangler deployments list
```

### Database Queries (for debugging)
```bash
# List users
wrangler d1 execute workbench-db --remote --command "SELECT * FROM users LIMIT 5"

# List products
wrangler d1 execute workbench-db --remote --command "SELECT id, name, price FROM inventory_items LIMIT 10"

# Count products
wrangler d1 execute workbench-db --remote --command "SELECT COUNT(*) as total FROM inventory_items"
```

---

## Next Steps

1. **Add Categories**: Populate the categories table with your product categories
2. **Upload Images**: Implement image upload to R2 buckets
3. **Build Admin Panel**: Create a dashboard for managing inventory
4. **Enable Search**: Test and refine the full-text search
5. **Add Chat**: Implement real-time chat between buyers and sellers
6. **AI Features**: Utilize Cloudflare AI for recommendations

---

## 🎉 You're All Set!

Your WorkBench Inventory System is live and ready to use. Start by adding products and exploring the features!

**Need Help?**
- Check `README.md` for detailed documentation
- Check `DEPLOYMENT.md` for deployment details
- View worker logs: `wrangler tail`
