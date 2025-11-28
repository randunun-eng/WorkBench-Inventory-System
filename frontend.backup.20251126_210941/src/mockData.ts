import type { Category, Product, ShopProfile } from './types/storefront';

export const MOCK_SHOPS: ShopProfile[] = [
  {
    id: "shop_1",
    name: "ElectroFix Components",
    slug: "electrofix",
    description: "Industrial switch gears and semiconductors.",
    rating: 4.8,
    totalSales: 12500,
    verified: true,
    contact: {
      phone: "+94 77 123 4567",
      email: "sales@electrofix.lk",
      address: "128 Galle Road, Colombo 03, Western Province"
    }
  },
  {
    id: "shop_2",
    name: "SolarTech Solutions",
    slug: "solartech",
    description: "Premium solar inverters and battery systems.",
    rating: 4.9,
    totalSales: 8200,
    verified: true,
    contact: {
      phone: "+94 81 223 3445",
      email: "info@solartech.lk",
      address: "45 Peradeniya Road, Kandy, Central Province"
    }
  },
  {
    id: "shop_3",
    name: "AutoVolts EV Parts",
    slug: "autovolts",
    description: "EV chargers, cables, and conversion kits.",
    rating: 4.6,
    totalSales: 3400,
    verified: false,
    contact: {
      phone: "+94 91 456 7890",
      email: "support@autovolts.lk",
      address: "88 Matara Road, Galle, Southern Province"
    }
  },
  {
    id: "shop_4",
    name: "Metro Electronics",
    slug: "metro-elec",
    description: "General purpose components and tools.",
    rating: 4.2,
    totalSales: 1500,
    verified: true,
    contact: {
      phone: "+94 37 222 1111",
      email: "sales@metroelec.lk",
      address: "12 Main Street, Kurunegala, North Western Province"
    }
  },
  {
    id: "shop_5",
    name: "Green Energy Hub",
    slug: "green-hub",
    description: "Wind and Solar DIY kits.",
    rating: 4.7,
    totalSales: 5600,
    verified: true,
    contact: {
      phone: "+94 21 222 3333",
      email: "contact@greenhub.lk",
      address: "404 Hospital Road, Jaffna, Northern Province"
    }
  },
  {
    id: "shop_6",
    name: "TechSource Pro",
    slug: "techsource",
    description: "High-end development boards and sensors.",
    rating: 4.9,
    totalSales: 9000,
    verified: true,
    contact: {
      phone: "+94 11 288 8999",
      email: "sales@techsource.lk",
      address: "99 New Kandy Road, Malabe, Western Province"
    }
  }
];

export const MOCK_CATEGORIES: Category[] = [
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

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    shopId: 'shop_1',
    name: 'Schneider C32 Single Pole MCB',
    description: 'High quality miniature circuit breaker for domestic and industrial use.',
    categoryId: 'cat_1_1',
    price: 1350.00,
    currency: 'LKR',
    stockQty: 500,
    minOrderQty: 10,
    image: 'https://picsum.photos/400/400?random=1',
    isHot: true,
    specs: [
      { label: 'Poles', value: '1' },
      { label: 'Amperage', value: '32A' },
      { label: 'Voltage', value: '230V AC' },
      { label: 'Breaking Capacity', value: '6kA' }
    ]
  },
  {
    id: 'prod_2',
    shopId: 'shop_1',
    name: 'Infineon IGBT Module 1200V 100A',
    description: 'High power IGBT module suitable for motor drives and inverters.',
    categoryId: 'cat_2_1',
    price: 13500.00,
    currency: 'LKR',
    stockQty: 25,
    minOrderQty: 1,
    image: 'https://picsum.photos/400/400?random=2',
    isHot: false,
    specs: [
      { label: 'Vces', value: '1200V' },
      { label: 'Ic', value: '100A' },
      { label: 'Package', value: 'EconoPACK' }
    ]
  },
  {
    id: 'prod_3',
    shopId: 'shop_2',
    name: '5kW Hybrid Solar Inverter 48V',
    description: 'Pure sine wave inverter with built-in MPPT solar charge controller.',
    categoryId: 'cat_3_1',
    price: null, // Wholesale/Contact only
    currency: 'LKR',
    stockQty: 5,
    minOrderQty: 1,
    image: 'https://picsum.photos/400/400?random=3',
    isHot: true,
    specs: [
      { label: 'Power', value: '5000W' },
      { label: 'Battery Voltage', value: '48V' },
      { label: 'MPPT Range', value: '120-450VDC' }
    ]
  },
  {
    id: 'prod_4',
    shopId: 'shop_1',
    name: 'IRF540N MOSFET',
    description: '100V Single N-Channel HEXFET Power MOSFET in a TO-220AB package.',
    categoryId: 'cat_2_2',
    price: 250.00,
    currency: 'LKR',
    stockQty: 2000,
    minOrderQty: 50,
    image: 'https://picsum.photos/400/400?random=4',
    isHot: false,
    specs: [
      { label: 'Vdss', value: '100V' },
      { label: 'Rds(on)', value: '44mOhm' },
      { label: 'Id', value: '33A' }
    ]
  },
  {
    id: 'prod_5',
    shopId: 'shop_3',
    name: 'EV Charging Gun Type 2',
    description: 'Portable EV charger cable 32A single phase.',
    categoryId: 'cat_4_2',
    price: 35000.00,
    currency: 'LKR',
    stockQty: 15,
    minOrderQty: 1,
    image: 'https://picsum.photos/400/400?random=5',
    isHot: false,
    specs: [
      { label: 'Current', value: '32A' },
      { label: 'Length', value: '5m' },
      { label: 'IP Rating', value: 'IP65' }
    ]
  },
  {
    id: 'prod_6',
    shopId: 'shop_3',
    name: 'DC Contactor 48V',
    description: 'Heavy duty DC contactor for battery isolation.',
    categoryId: 'cat_1_3',
    price: 6750.00,
    currency: 'LKR',
    stockQty: 80,
    minOrderQty: 2,
    image: 'https://picsum.photos/400/400?random=6',
    isHot: false,
    specs: [
      { label: 'Coil Voltage', value: '48V DC' },
      { label: 'Poles', value: '2 NO' }
    ]
  },
  {
    id: 'prod_7',
    shopId: 'shop_4',
    name: 'Digital Multimeter XL830L',
    description: 'Compact multimeter for voltage, current, and resistance.',
    categoryId: 'cat_5_2', 
    price: 3600.00,
    currency: 'LKR',
    stockQty: 100,
    minOrderQty: 1,
    image: 'https://picsum.photos/400/400?random=7',
    isHot: true,
    specs: [
      { label: 'DC Voltage', value: '200mV-600V' },
      { label: 'Display', value: 'LCD' }
    ]
  },
  {
    id: 'prod_8',
    shopId: 'shop_5',
    name: '400W Wind Turbine Generator',
    description: '12V/24V Wind turbine for home use.',
    categoryId: 'cat_3_1',
    price: 54000.00,
    currency: 'LKR',
    stockQty: 3,
    minOrderQty: 1,
    image: 'https://picsum.photos/400/400?random=8',
    isHot: false,
    specs: [
      { label: 'Rated Power', value: '400W' },
      { label: 'Blades', value: '5 Nylon' }
    ]
  },
  {
    id: 'prod_9',
    shopId: 'shop_6',
    name: 'ESP32 Development Board',
    description: 'WiFi + Bluetooth Dual Core Microcontroller.',
    categoryId: 'cat_2_2',
    price: 1650.00,
    currency: 'LKR',
    stockQty: 300,
    minOrderQty: 5,
    image: 'https://picsum.photos/400/400?random=9',
    isHot: true,
    specs: [
      { label: 'Chip', value: 'ESP32-WROOM' },
      { label: 'Flash', value: '4MB' }
    ]
  }
];