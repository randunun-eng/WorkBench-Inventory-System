#!/bin/bash

# WorkBench Inventory - Add Mock Data from GitHub Repository
# This script adds sample data matching the GitHub mockData.ts exactly

API_URL="https://workbench-inventory.randunun.workers.dev"

echo "=========================================="
echo "Adding GitHub Mock Data to WorkBench"
echo "=========================================="
echo ""

# Arrays to store tokens and slugs
declare -A SHOP_TOKENS
declare -A SHOP_SLUGS

# Function to create or login to shop
create_or_login_shop() {
    local email=$1
    local password=$2
    local shop_name=$3
    local shop_number=$4

    echo "📦 Creating Shop $shop_number: $shop_name..."

    RESPONSE=$(curl -s -X POST "$API_URL/auth/signup" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$email\",
        \"password\": \"$password\",
        \"shop_name\": \"$shop_name\"
      }")

    TOKEN=$(echo $RESPONSE | jq -r '.token')
    SLUG=$(echo $RESPONSE | jq -r '.user.shop_slug')

    if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
        echo "✅ Shop $shop_number created successfully"
        echo "   Slug: $SLUG"
    else
        echo "⚠️  Shop $shop_number might already exist, trying to login..."
        RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
          -H "Content-Type: application/json" \
          -d "{
            \"email\": \"$email\",
            \"password\": \"$password\"
          }")
        TOKEN=$(echo $RESPONSE | jq -r '.token')
        SLUG=$(echo $RESPONSE | jq -r '.user.shop_slug')
        echo "✅ Logged into Shop $shop_number"
    fi

    SHOP_TOKENS[$shop_number]=$TOKEN
    SHOP_SLUGS[$shop_number]=$SLUG
    echo ""
}

# Shop 1: ElectroFix Components
create_or_login_shop "electrofix@example.com" "password123" "ElectroFix Components" "1"

# Add products for ElectroFix Components (shop_1)
echo "📦 Adding products for ElectroFix Components..."

curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SHOP_TOKENS[1]}" \
  -d '{
    "name": "Schneider C32 Single Pole MCB",
    "description": "High quality miniature circuit breaker for domestic and industrial use.",
    "category_id": "6",
    "price": 1350.00,
    "currency": "LKR",
    "stock_qty": 500,
    "specifications": [
      {"label": "Poles", "value": "1"},
      {"label": "Amperage", "value": "32A"},
      {"label": "Voltage", "value": "230V AC"},
      {"label": "Breaking Capacity", "value": "6kA"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added Schneider C32 MCB"

curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SHOP_TOKENS[1]}" \
  -d '{
    "name": "Infineon IGBT Module 1200V 100A",
    "description": "High power IGBT module suitable for motor drives and inverters.",
    "category_id": "9",
    "price": 13500.00,
    "currency": "LKR",
    "stock_qty": 25,
    "specifications": [
      {"label": "Vces", "value": "1200V"},
      {"label": "Ic", "value": "100A"},
      {"label": "Package", "value": "EconoPACK"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added Infineon IGBT Module"

curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SHOP_TOKENS[1]}" \
  -d '{
    "name": "IRF540N MOSFET",
    "description": "100V Single N-Channel HEXFET Power MOSFET in a TO-220AB package.",
    "category_id": "10",
    "price": 250.00,
    "currency": "LKR",
    "stock_qty": 2000,
    "specifications": [
      {"label": "Vdss", "value": "100V"},
      {"label": "Rds(on)", "value": "44mOhm"},
      {"label": "Id", "value": "33A"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added IRF540N MOSFET"

# Shop 2: SolarTech Solutions
create_or_login_shop "solartech@example.com" "password123" "SolarTech Solutions" "2"

echo "📦 Adding products for SolarTech Solutions..."

curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SHOP_TOKENS[2]}" \
  -d '{
    "name": "5kW Hybrid Solar Inverter 48V",
    "description": "Pure sine wave inverter with built-in MPPT solar charge controller.",
    "category_id": "12",
    "price": null,
    "currency": "LKR",
    "stock_qty": 5,
    "specifications": [
      {"label": "Power", "value": "5000W"},
      {"label": "Battery Voltage", "value": "48V"},
      {"label": "MPPT Range", "value": "120-450VDC"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added 5kW Solar Inverter (Contact for Price)"

# Shop 3: AutoVolts EV Parts
create_or_login_shop "autovolts@example.com" "password123" "AutoVolts EV Parts" "3"

echo "📦 Adding products for AutoVolts EV Parts..."

curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SHOP_TOKENS[3]}" \
  -d '{
    "name": "EV Charging Gun Type 2",
    "description": "Portable EV charger cable 32A single phase.",
    "category_id": "15",
    "price": 35000.00,
    "currency": "LKR",
    "stock_qty": 15,
    "specifications": [
      {"label": "Current", "value": "32A"},
      {"label": "Length", "value": "5m"},
      {"label": "IP Rating", "value": "IP65"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added EV Charging Gun Type 2"

curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SHOP_TOKENS[3]}" \
  -d '{
    "name": "DC Contactor 48V",
    "description": "Heavy duty DC contactor for battery isolation.",
    "category_id": "8",
    "price": 6750.00,
    "currency": "LKR",
    "stock_qty": 80,
    "specifications": [
      {"label": "Coil Voltage", "value": "48V DC"},
      {"label": "Poles", "value": "2 NO"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added DC Contactor 48V"

# Shop 4: Metro Electronics
create_or_login_shop "metro@example.com" "password123" "Metro Electronics" "4"

echo "📦 Adding products for Metro Electronics..."

curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SHOP_TOKENS[4]}" \
  -d '{
    "name": "Digital Multimeter XL830L",
    "description": "Compact multimeter for voltage, current, and resistance.",
    "category_id": "18",
    "price": 3600.00,
    "currency": "LKR",
    "stock_qty": 100,
    "specifications": [
      {"label": "DC Voltage", "value": "200mV-600V"},
      {"label": "Display", "value": "LCD"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added Digital Multimeter XL830L"

# Shop 5: Green Energy Hub
create_or_login_shop "greenhub@example.com" "password123" "Green Energy Hub" "5"

echo "📦 Adding products for Green Energy Hub..."

curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SHOP_TOKENS[5]}" \
  -d '{
    "name": "400W Wind Turbine Generator",
    "description": "12V/24V Wind turbine for home use.",
    "category_id": "12",
    "price": 54000.00,
    "currency": "LKR",
    "stock_qty": 3,
    "specifications": [
      {"label": "Rated Power", "value": "400W"},
      {"label": "Blades", "value": "5 Nylon"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added 400W Wind Turbine Generator"

# Shop 6: TechSource Pro
create_or_login_shop "techsource@example.com" "password123" "TechSource Pro" "6"

echo "📦 Adding products for TechSource Pro..."

curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SHOP_TOKENS[6]}" \
  -d '{
    "name": "ESP32 Development Board",
    "description": "WiFi + Bluetooth Dual Core Microcontroller.",
    "category_id": "10",
    "price": 1650.00,
    "currency": "LKR",
    "stock_qty": 300,
    "specifications": [
      {"label": "Chip", "value": "ESP32-WROOM"},
      {"label": "Flash", "value": "4MB"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added ESP32 Development Board"

echo ""
echo "=========================================="
echo "✅ GitHub Mock Data Added Successfully!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  • 6 shops created (matching GitHub repo)"
echo "  • 9 products added (matching GitHub repo)"
echo ""
echo "Shops:"
echo "  1. ElectroFix Components - 3 products"
echo "  2. SolarTech Solutions - 1 product"
echo "  3. AutoVolts EV Parts - 2 products"
echo "  4. Metro Electronics - 1 product"
echo "  5. Green Energy Hub - 1 product"
echo "  6. TechSource Pro - 1 product"
echo ""
echo "Password for all shops: password123"
echo ""
echo "🌐 Visit: https://workbench-inventory.randunun.workers.dev"
echo ""
