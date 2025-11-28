# Email Notification Setup Instructions

## ✅ What's Already Configured

1. **Admin email**: randunun@gmail.com
2. **Email code**: Fully implemented and deployed
3. **Email template**: Professional HTML email with shop registration details

## 📧 To Enable Email Notifications

### Step 1: Get Resend API Key (FREE)

1. Go to **https://resend.com**
2. Click **"Sign Up"** (or "Get Started")
3. Create account with your email (randunun@gmail.com recommended)
4. Verify your email address
5. Once logged in, go to **"API Keys"** section in the dashboard
6. Click **"Create API Key"**
7. Give it a name like "WorkBench Notifications"
8. Copy the API key (starts with `re_...`)

### Step 2: Add API Key to Cloudflare Workers

Open a terminal and run:

```bash
cd "/home/dell/Documents/github/workbench inventory"
wrangler secret put RESEND_API_KEY
```

When prompted, **paste your Resend API key** and press Enter.

### Step 3: Deploy Changes

```bash
wrangler deploy
```

### Step 4: Test Email Delivery

1. Go to https://workbench-inventory.randunun.workers.dev/join
2. Register a NEW test shop (e.g., "Test Shop 2", test2@example.com, password123)
3. Check your inbox at **randunun@gmail.com**
4. You should receive an email with:
   - Subject: "🏪 New Shop Registration: Test Shop 2"
   - Shop details (name, email, slug, user ID, timestamp)
   - Link to view shop details

## 📋 Resend Free Tier

- **100 emails per day** (FREE forever)
- Perfect for shop registration notifications
- No credit card required
- Can upgrade later if needed

## 🎯 What Happens When Shop Registers

1. User fills signup form
2. Account created in database ✅
3. JWT token generated and saved ✅
4. **Email sent to randunun@gmail.com** with shop details
5. User redirected to homepage as logged-in shop

## ⚠️ Current Status

- ❌ **RESEND_API_KEY not configured** (emails won't send until you add it)
- ✅ **ADMIN_EMAIL configured** (randunun@gmail.com)
- ✅ **Email code deployed and ready**

Once you add the Resend API key, emails will start working immediately!
