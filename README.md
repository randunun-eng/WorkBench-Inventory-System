# WorkBench Inventory System

A comprehensive, cloud-native inventory management and shop networking system built with **React** and **Cloudflare Workers**.

![Status](https://img.shields.io/badge/Status-Live-success)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)

## 🚀 Live Demo
**URL**: https://workbench-inventory.randunun.workers.dev

## 📖 Overview

The WorkBench Inventory System is a full-stack application designed to help electronics shops and hobbyists manage their inventory, connect with other shops, and leverage AI for component analysis. It features a modern, responsive frontend and a high-performance, serverless backend.

## ✨ Key Features

### 🏪 Storefront & Inventory
- **Public Storefront**: Browse products from all registered shops.
- **Advanced Search**: Real-time, full-text search using SQLite FTS5.
- **Shop Profiles**: Dedicated pages for each shop with their specific inventory.
- **Product Management**: Full CRUD capabilities for shop owners.
- **Image Hosting**: Secure image uploads using Cloudflare R2.

### 🔐 Authentication & Security
- **Secure Auth**: JWT-based authentication with SHA-256 password hashing.
- **Shop Registration**: Self-service signup for new shop owners.
- **Role-Based Access**: Protected routes for inventory management.

### 💬 Real-Time Communication
- **Live Chat**: Real-time messaging system powered by Cloudflare Durable Objects.
- **Presence**: See who is online in real-time.
- **Shop-to-Shop Networking**: Connect with other sellers in the network.

### 🤖 AI & Vision Capabilities
- **Datasheet Analysis**: AI-powered extraction of specs from component datasheets (PDFs).
- **Vision Analysis**: Identify components from images using computer vision.
- **Smart Categorization**: AI suggestions for product categories.

## 🏗 Architecture

The project follows a modern serverless architecture:

### Frontend (`/frontend`)
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS for responsive design
- **Routing**: React Router v6
- **State**: React Hooks + Context API

### Backend (`/src`)
- **Runtime**: Cloudflare Workers
- **Framework**: Hono (lightweight web framework)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (Object Storage)
- **State**: Durable Objects (for WebSocket/Chat)

## 🛠 Project Structure

```
workbench-inventory/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Route components
│   │   ├── services/        # API client layer
│   │   └── types.ts         # TypeScript definitions
│   └── dist/                # Production build artifacts
├── src/                     # Cloudflare Workers backend
│   ├── routes/              # API endpoints (auth, inventory, etc.)
│   ├── do/                  # Durable Objects (ChatRoom, Presence)
│   └── index.ts            # Application entry point
├── migrations/              # D1 Database schemas
└── wrangler.toml           # Deployment configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Cloudflare Wrangler CLI (`npm install -g wrangler`)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/randunun-eng/WorkBench-Inventory-System.git
   cd WorkBench-Inventory-System
   ```

2. **Install Backend Dependencies**
   ```bash
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

### Local Development

1. **Start the Backend** (runs on port 8787)
   ```bash
   # From root directory
   npm run dev
   ```

2. **Start the Frontend** (runs on port 3000)
   ```bash
   # From frontend directory
   npm run dev
   ```

   *Note: Ensure `VITE_API_BASE_URL` in `frontend/.env.local` points to `http://localhost:8787`.*

## 📦 Deployment

This project is configured for seamless deployment to Cloudflare Workers.

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   cd ..
   ```

2. **Deploy Worker**
   ```bash
   wrangler deploy
   ```

   *This command deploys the backend code and serves the static frontend assets from the Worker.*

## 🧪 API Endpoints

### Public
- `GET /api/search?q={query}` - Search products
- `GET /api/shop/{slug}` - Get shop details
- `POST /auth/login` - User login
- `POST /auth/signup` - Register new shop

### Protected (Bearer Token)
- `GET /api/inventory` - List my items
- `POST /api/inventory` - Add new item
- `POST /api/chat` - Send chat message
- `POST /api/ai` - AI analysis request

## 📄 License

Proprietary - All rights reserved.
