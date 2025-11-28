# WorkBench Inventory System

A complete inventory management system built with React (frontend) and Cloudflare Workers (backend).

## Architecture

- **Frontend**: React + Vite + TailwindCSS + React Router
- **Backend**: Cloudflare Workers + Hono + D1 Database + R2 Storage
- **Features**: Product listing, shop management, search, authentication, chat, AI features

## Project Structure

```
workbench-inventory/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service layer
│   │   └── types.ts         # TypeScript types
│   ├── dist/                # Built frontend assets
│   └── package.json
├── src/                     # Backend API
│   ├── routes/              # API route handlers
│   ├── do/                  # Durable Objects
│   └── index.ts            # Main entry point
├── migrations/              # Database migrations
└── wrangler.toml           # Cloudflare Workers config
```

## Setup

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Wrangler CLI (Cloudflare Workers)

### Installation

1. Install backend dependencies:
```bash
npm install
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

### Database Setup

Initialize the D1 database:
```bash
wrangler d1 create workbench-db
```

Update `wrangler.toml` with your database ID, then run migrations:
```bash
wrangler d1 execute workbench-db --local --file=./migrations/schema.sql
```

## Development

### Running Locally

1. **Start the backend**:
```bash
npm run dev
# or
wrangler dev
```

The backend will run at `http://localhost:8787`

2. **Build the frontend** (in another terminal):
```bash
cd frontend
npm run build
```

The integrated system will serve both frontend and backend at `http://localhost:8787`

### Frontend Development

For frontend-only development with hot reload:
```bash
cd frontend
npm run dev
```

This will start the Vite dev server at `http://localhost:3000`

Make sure to set `VITE_API_BASE_URL=http://localhost:8787` in `frontend/.env.local`

## API Endpoints

### Public Endpoints

- `GET /api/search?q=<query>` - Search for products
- `GET /api/shop/:slug` - Get shop details and inventory
- `POST /auth/signup` - Create new shop account
- `POST /auth/login` - Login

### Protected Endpoints (require authentication)

- `GET /api/inventory` - List user's inventory
- `POST /api/inventory` - Create inventory item
- `GET /api/inventory/:id` - Get item details
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item
- `POST /api/upload` - Upload images
- `POST /api/chat` - Chat features
- `GET /api/network` - Network features
- `POST /api/ai` - AI features
- `POST /api/vision` - Vision/image analysis

## Deployment

### Deploy to Cloudflare Workers

1. Build the frontend:
```bash
cd frontend
npm run build
cd ..
```

2. Deploy:
```bash
npm run deploy
# or
wrangler deploy
```

## Environment Variables

### Frontend (.env.local)

```
VITE_API_BASE_URL=http://localhost:8787
```

For production, update to your deployed Workers URL.

## Features

### Frontend

- **Storefront**: Browse products by category and shop
- **Product Details**: View detailed product information
- **Shop Profiles**: View shop details and inventory
- **Search**: Full-text search across products
- **Registration**: Join the WorkBench network as a seller
- **Responsive Design**: Mobile-first design with Tailwind CSS

### Backend

- **Authentication**: JWT-based auth with secure password hashing
- **Inventory Management**: CRUD operations for products
- **Search**: FTS5 full-text search
- **Image Upload**: R2 storage for product images
- **Chat**: Real-time chat with Durable Objects
- **AI Features**: Integration with Cloudflare AI
- **Vision**: Image analysis capabilities

## Recent Changes

### Integration (2025-11-26)

- Integrated new React frontend with existing Cloudflare Workers backend
- Created comprehensive API service layer in frontend
- Updated all components to use real API calls instead of mock data
- Configured Wrangler to serve frontend assets
- Fixed React version conflicts
- Added environment variable configuration
- Built production-ready assets

## Troubleshooting

### Frontend build fails

Make sure dependencies are installed:
```bash
cd frontend
npm install
```

### Backend doesn't serve frontend

1. Check that frontend is built: `ls frontend/dist`
2. Verify wrangler.toml has assets configuration
3. Restart the dev server

### API calls fail

1. Check CORS configuration in backend
2. Verify API_BASE_URL in frontend/.env.local
3. Check browser console for errors

## Contributing

This is a private project. Contact the repository owner for contribution guidelines.

## License

Proprietary - All rights reserved
