#!/bin/bash

# WorkBench Inventory - Add Mock Data Script
# This script adds sample shops and products to test the system

API_URL="https://workbench-inventory.randunun.workers.dev"

echo "=========================================="
echo "Adding Mock Data to WorkBench Inventory"
echo "=========================================="
echo ""

# Shop 1: ElectroFix Components
echo "📦 Creating Shop 1: ElectroFix Components..."
SHOP1_RESPONSE=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "electrofix@example.com",
    "password": "password123",
    "shop_name": "ElectroFix Components"
  }')

SHOP1_TOKEN=$(echo $SHOP1_RESPONSE | jq -r '.token')
SHOP1_SLUG=$(echo $SHOP1_RESPONSE | jq -r '.user.shop_slug')

if [ "$SHOP1_TOKEN" != "null" ] && [ -n "$SHOP1_TOKEN" ]; then
    echo "✅ Shop 1 created successfully"
    echo "   Slug: $SHOP1_SLUG"
    echo "   Token: ${SHOP1_TOKEN:0:20}..."
else
    echo "⚠️  Shop 1 might already exist, trying to login..."
    SHOP1_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "electrofix@example.com",
        "password": "password123"
      }')
    SHOP1_TOKEN=$(echo $SHOP1_RESPONSE | jq -r '.token')
    SHOP1_SLUG=$(echo $SHOP1_RESPONSE | jq -r '.user.shop_slug')
    echo "✅ Logged into Shop 1"
fi
echo ""

# Add products for Shop 1
echo "📦 Adding products for ElectroFix Components..."

# Product 1: MCB
curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SHOP1_TOKEN" \
  -d '{
    "name": "Schneider C32 Single Pole MCB",
    "description": "High quality miniature circuit breaker for domestic and industrial use. Reliable protection for electrical circuits.",
    "category_id": "1",
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
echo "  ✅ Added Schneider MCB"

# Product 2: IGBT Module
curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SHOP1_TOKEN" \
  -d '{
    "name": "Infineon IGBT Module 1200V 100A",
    "description": "High power IGBT module suitable for motor drives and inverters. Industrial grade reliability.",
    "category_id": "2",
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

# Product 3: MOSFET
curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SHOP1_TOKEN" \
  -d '{
    "name": "IRF540N MOSFET",
    "description": "100V Single N-Channel HEXFET Power MOSFET in a TO-220AB package. Perfect for switching applications.",
    "category_id": "2",
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

# Product 4: Contactor
curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SHOP1_TOKEN" \
  -d '{
    "name": "ABB Contactor 63A 3-Phase",
    "description": "Industrial contactor for motor control and switching applications. Durable and reliable.",
    "category_id": "1",
    "price": 4500.00,
    "currency": "LKR",
    "stock_qty": 150,
    "specifications": [
      {"label": "Current Rating", "value": "63A"},
      {"label": "Poles", "value": "3NO"},
      {"label": "Coil Voltage", "value": "230V AC"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added ABB Contactor"

echo ""

# Shop 2: SolarTech Solutions
echo "📦 Creating Shop 2: SolarTech Solutions..."
SHOP2_RESPONSE=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "solartech@example.com",
    "password": "password123",
    "shop_name": "SolarTech Solutions"
  }')

SHOP2_TOKEN=$(echo $SHOP2_RESPONSE | jq -r '.token')
SHOP2_SLUG=$(echo $SHOP2_RESPONSE | jq -r '.user.shop_slug')

if [ "$SHOP2_TOKEN" != "null" ] && [ -n "$SHOP2_TOKEN" ]; then
    echo "✅ Shop 2 created successfully"
    echo "   Slug: $SHOP2_SLUG"
else
    echo "⚠️  Shop 2 might already exist, trying to login..."
    SHOP2_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "solartech@example.com",
        "password": "password123"
      }')
    SHOP2_TOKEN=$(echo $SHOP2_RESPONSE | jq -r '.token')
    SHOP2_SLUG=$(echo $SHOP2_RESPONSE | jq -r '.user.shop_slug')
    echo "✅ Logged into Shop 2"
fi
echo ""

# Add products for Shop 2
echo "📦 Adding products for SolarTech Solutions..."

# Product 1: Solar Inverter
curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SHOP2_TOKEN" \
  -d '{
    "name": "5kW Hybrid Solar Inverter 48V",
    "description": "Pure sine wave inverter with built-in MPPT solar charge controller. Perfect for off-grid and hybrid systems.",
    "category_id": "3",
    "price": 75000.00,
    "currency": "LKR",
    "stock_qty": 8,
    "specifications": [
      {"label": "Power", "value": "5000W"},
      {"label": "Battery Voltage", "value": "48V"},
      {"label": "MPPT Range", "value": "120-450VDC"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added 5kW Solar Inverter"

# Product 2: MPPT Controller
curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SHOP2_TOKEN" \
  -d '{
    "name": "60A MPPT Solar Charge Controller",
    "description": "Maximum Power Point Tracking charge controller for optimal solar panel efficiency. LCD display included.",
    "category_id": "3",
    "price": 12500.00,
    "currency": "LKR",
    "stock_qty": 35,
    "specifications": [
      {"label": "Current", "value": "60A"},
      {"label": "System Voltage", "value": "12V/24V/48V Auto"},
      {"label": "Max PV Input", "value": "150V"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added MPPT Controller"

# Product 3: Solar Panels
curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SHOP2_TOKEN" \
  -d '{
    "name": "450W Monocrystalline Solar Panel",
    "description": "High efficiency monocrystalline solar panel with 25-year warranty. Perfect for residential and commercial installations.",
    "category_id": "3",
    "price": 28000.00,
    "currency": "LKR",
    "stock_qty": 50,
    "specifications": [
      {"label": "Power", "value": "450W"},
      {"label": "Efficiency", "value": "21.5%"},
      {"label": "Dimensions", "value": "2108x1048x40mm"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added Solar Panels"

echo ""

# Shop 3: AutoVolts EV Parts
echo "📦 Creating Shop 3: AutoVolts EV Parts..."
SHOP3_RESPONSE=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "autovolts@example.com",
    "password": "password123",
    "shop_name": "AutoVolts EV Parts"
  }')

SHOP3_TOKEN=$(echo $SHOP3_RESPONSE | jq -r '.token')
SHOP3_SLUG=$(echo $SHOP3_RESPONSE | jq -r '.user.shop_slug')

if [ "$SHOP3_TOKEN" != "null" ] && [ -n "$SHOP3_TOKEN" ]; then
    echo "✅ Shop 3 created successfully"
    echo "   Slug: $SHOP3_SLUG"
else
    echo "⚠️  Shop 3 might already exist, trying to login..."
    SHOP3_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "autovolts@example.com",
        "password": "password123"
      }')
    SHOP3_TOKEN=$(echo $SHOP3_RESPONSE | jq -r '.token')
    SHOP3_SLUG=$(echo $SHOP3_RESPONSE | jq -r '.user.shop_slug')
    echo "✅ Logged into Shop 3"
fi
echo ""

# Add products for Shop 3
echo "📦 Adding products for AutoVolts EV Parts..."

# Product 1: EV Charger
curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SHOP3_TOKEN" \
  -d '{
    "name": "Type 2 EV Charging Cable 32A",
    "description": "Portable EV charger cable for Type 2 vehicles. Single phase 32A with 5 meter length.",
    "category_id": "4",
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
echo "  ✅ Added EV Charging Cable"

# Product 2: DC Contactor
curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SHOP3_TOKEN" \
  -d '{
    "name": "DC Contactor 48V 200A",
    "description": "Heavy duty DC contactor for battery isolation in electric vehicles and energy storage systems.",
    "category_id": "4",
    "price": 6750.00,
    "currency": "LKR",
    "stock_qty": 80,
    "specifications": [
      {"label": "Coil Voltage", "value": "48V DC"},
      {"label": "Current Rating", "value": "200A"},
      {"label": "Poles", "value": "2 NO"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added DC Contactor"

# Product 3: BMS
curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SHOP3_TOKEN" \
  -d '{
    "name": "16S 48V 100A Battery Management System",
    "description": "Smart BMS for lithium-ion battery packs. Includes balancing, protection, and bluetooth monitoring.",
    "category_id": "4",
    "price": 18500.00,
    "currency": "LKR",
    "stock_qty": 22,
    "specifications": [
      {"label": "Configuration", "value": "16S (48V)"},
      {"label": "Max Current", "value": "100A"},
      {"label": "Features", "value": "Bluetooth + App"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added Battery Management System"

echo ""

# Shop 4: TechSource Pro
echo "📦 Creating Shop 4: TechSource Pro..."
SHOP4_RESPONSE=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "techsource@example.com",
    "password": "password123",
    "shop_name": "TechSource Pro"
  }')

SHOP4_TOKEN=$(echo $SHOP4_RESPONSE | jq -r '.token')
SHOP4_SLUG=$(echo $SHOP4_RESPONSE | jq -r '.user.shop_slug')

if [ "$SHOP4_TOKEN" != "null" ] && [ -n "$SHOP4_TOKEN" ]; then
    echo "✅ Shop 4 created successfully"
    echo "   Slug: $SHOP4_SLUG"
else
    echo "⚠️  Shop 4 might already exist, trying to login..."
    SHOP4_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "techsource@example.com",
        "password": "password123"
      }')
    SHOP4_TOKEN=$(echo $SHOP4_RESPONSE | jq -r '.token')
    SHOP4_SLUG=$(echo $SHOP4_RESPONSE | jq -r '.user.shop_slug')
    echo "✅ Logged into Shop 4"
fi
echo ""

# Add products for Shop 4
echo "📦 Adding products for TechSource Pro..."

# Product 1: ESP32
curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SHOP4_TOKEN" \
  -d '{
    "name": "ESP32 Development Board",
    "description": "WiFi + Bluetooth Dual Core Microcontroller. Perfect for IoT projects and embedded systems.",
    "category_id": "2",
    "price": 1650.00,
    "currency": "LKR",
    "stock_qty": 300,
    "specifications": [
      {"label": "Chip", "value": "ESP32-WROOM"},
      {"label": "Flash", "value": "4MB"},
      {"label": "Connectivity", "value": "WiFi + BLE"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added ESP32 Development Board"

# Product 2: Arduino
curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SHOP4_TOKEN" \
  -d '{
    "name": "Arduino Mega 2560",
    "description": "Microcontroller board with 54 digital I/O pins. Ideal for complex projects requiring many inputs and outputs.",
    "category_id": "2",
    "price": 3200.00,
    "currency": "LKR",
    "stock_qty": 120,
    "specifications": [
      {"label": "Microcontroller", "value": "ATmega2560"},
      {"label": "Digital I/O", "value": "54 pins"},
      {"label": "Analog Inputs", "value": "16"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added Arduino Mega"

# Product 3: Raspberry Pi
curl -s -X POST "$API_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SHOP4_TOKEN" \
  -d '{
    "name": "Raspberry Pi 4 Model B 4GB",
    "description": "Single board computer with quad-core processor. Complete kit with power supply and case.",
    "category_id": "2",
    "price": 15800.00,
    "currency": "LKR",
    "stock_qty": 45,
    "specifications": [
      {"label": "RAM", "value": "4GB LPDDR4"},
      {"label": "CPU", "value": "Quad-core ARM"},
      {"label": "Connectivity", "value": "WiFi + BT + Gigabit Ethernet"}
    ],
    "is_public": true,
    "is_visible_to_network": true
  }' > /dev/null
echo "  ✅ Added Raspberry Pi 4"

echo ""
echo "=========================================="
echo "✅ Mock Data Added Successfully!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  • 4 shops created"
echo "  • 14 products added"
echo ""
echo "Shops:"
echo "  1. ElectroFix Components (electrofix@example.com)"
echo "  2. SolarTech Solutions (solartech@example.com)"
echo "  3. AutoVolts EV Parts (autovolts@example.com)"
echo "  4. TechSource Pro (techsource@example.com)"
echo ""
echo "Password for all shops: password123"
echo ""
echo "🌐 Visit: https://workbench-inventory.randunun.workers.dev"
echo ""
