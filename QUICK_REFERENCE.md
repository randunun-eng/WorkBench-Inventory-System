# Quick Reference - WorkBench Inventory System

## 🌐 Live URL
https://workbench-inventory.randunun.workers.dev

---

## 🔐 Test Accounts

| Shop Name | Email | Password | Products |
|-----------|-------|----------|----------|
| ElectroFix Components | electrofix@example.com | password123 | 5 |
| SolarTech Solutions | solartech@example.com | password123 | 3 |
| AutoVolts EV Parts | autovolts@example.com | password123 | 3 |
| TechSource Pro | techsource@example.com | password123 | 3 |

---

## 📱 Frontend Routes

- **Homepage**: `/`
- **Product Detail**: `/product/:id`
- **Join/Register**: `/join`

---

## 🔌 API Endpoints

### Public
```bash
# API Status
GET /api

# Search Products
GET /api/search?q=<query>

# Get Shop
GET /api/shop/<slug>

# Signup
POST /auth/signup
{
  "email": "...",
  "password": "...",
  "shop_name": "..."
}

# Login
POST /auth/login
{
  "email": "...",
  "password": "..."
}
```

### Protected (require Bearer token)
```bash
# List Inventory
GET /api/inventory

# Create Product
POST /api/inventory
{
  "name": "Product Name",
  "description": "...",
  "category_id": "1",
  "price": 1000.00,
  "currency": "LKR",
  "stock_qty": 50,
  "specifications": [...],
  "is_public": true,
  "is_visible_to_network": true
}

# Update Product
PUT /api/inventory/:id

# Delete Product
DELETE /api/inventory/:id
```

---

## 🧪 Quick Tests

```bash
# Test API
curl https://workbench-inventory.randunun.workers.dev/api

# Search products
curl "https://workbench-inventory.randunun.workers.dev/api/search?q=solar"

# View shop
curl "https://workbench-inventory.randunun.workers.dev/api/shop/electrofix-components"

# Login
curl -X POST https://workbench-inventory.randunun.workers.dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"electrofix@example.com","password":"password123"}'
```

---

## 🛠️ Management Commands

```bash
# Deploy
wrangler deploy

# View logs
wrangler tail

# List deployments
wrangler deployments list

# Database query
wrangler d1 execute workbench-db --remote --command "SELECT COUNT(*) FROM inventory_items"

# Add mock data
./add-mock-data.sh

# Verify deployment
./verify-deployment.sh
```

---

## 📊 Current Data

- **Shops**: 4
- **Products**: 14
- **Categories**: 23 (5 main + 18 sub)
- **Total Value**: ~LKR 296,250

---

## 🗂️ Product Categories

1. Switch Gears (MCB, MCCB, Contactors)
2. Semiconductors (IGBT, MOSFETs, Diodes)
3. Solar Equipment (Inverters, MPPT)
4. EV Infrastructure (Chargers, Connectors)
5. Passive Components (Capacitors, Resistors)

---

## 📁 Important Files

- `README.md` - Complete documentation
- `DEPLOYMENT_STATUS.md` - Current deployment info
- `MOCK_DATA_SUMMARY.md` - Mock data details
- `QUICKSTART.md` - Getting started guide
- `add-mock-data.sh` - Add sample data
- `verify-deployment.sh` - Test deployment

---

## 🚀 Sample Product Data

### ElectroFix Components
- Schneider MCB (LKR 1,350)
- Infineon IGBT (LKR 13,500)
- IRF540N MOSFET (LKR 250)
- ABB Contactor (LKR 4,500)

### SolarTech Solutions
- 5kW Solar Inverter (LKR 75,000)
- 60A MPPT Controller (LKR 12,500)
- 450W Solar Panel (LKR 28,000)

### AutoVolts EV Parts
- Type 2 EV Cable (LKR 35,000)
- DC Contactor (LKR 6,750)
- BMS 16S 48V (LKR 18,500)

### TechSource Pro
- ESP32 Board (LKR 1,650)
- Arduino Mega (LKR 3,200)
- Raspberry Pi 4 (LKR 15,800)

---

## ⚡ Performance

- Worker Startup: ~20-35ms
- API Response: ~0.5s
- Search: Full-text with FTS5
- Caching: Cloudflare CDN

---

**Everything is ready to test! Visit the live site now! 🎉**
