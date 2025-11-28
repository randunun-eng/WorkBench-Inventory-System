# Deployment Guide

To deploy the WorkBench Inventory System to Cloudflare, follow these steps:

## Prerequisites
- Cloudflare Account
- `npm` installed

## 1. Login to Cloudflare
Run the following command to authenticate `wrangler` with your Cloudflare account:
```bash
npx wrangler login
```

## 2. Deploy Backend (Workers)
This will deploy the API, D1 Database, and Durable Objects.
```bash
npx wrangler deploy
```
*Note: If this is your first deploy, you might need to create the D1 database manually if `wrangler.toml` IDs are placeholders.*
```bash
npx wrangler d1 create workbench-db
# Update wrangler.toml with the new database_id
```

## 3. Deploy Frontend (Pages)
This will deploy the React application.
```bash
cd frontend
npm run build
cd ..
npx wrangler pages deploy frontend/dist --project-name workbench-frontend
```

## 4. Post-Deployment
- **Secrets**: Set your R2 keys and JWT secret in the Cloudflare Dashboard or via CLI:
  ```bash
  npx wrangler secret put R2_ACCESS_KEY_ID
  npx wrangler secret put R2_SECRET_ACCESS_KEY
  npx wrangler secret put R2_ACCOUNT_ID
  ```
