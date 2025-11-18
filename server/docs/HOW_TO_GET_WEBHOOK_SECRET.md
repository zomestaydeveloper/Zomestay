# How to Get Razorpay Webhook Secret

## Option 1: Edit Existing Webhook (Recommended)

### Step 1: Open Webhook Details
1. **Go to Razorpay Dashboard** → **Account & Settings** → **Webhooks**
2. **Click on your webhook**: `http://api.techiconnect.shop/webhooks/razorpay`
3. **Right panel opens** showing webhook details

### Step 2: Click "Edit" Button
1. **Click "Edit"** button (top right in the panel)
2. **Edit dialog opens**

### Step 3: Generate/Show Secret
1. **Find "Secret" section** in the edit dialog
2. **Look for "Generate Secret"** or **"Show Secret"** button
3. **Click it** → Secret will be generated/displayed
4. **Copy the secret** (starts with `whsec_`)

### Step 4: Save Webhook
1. **Click "Save"** or **"Update Webhook"**
2. **Secret is now active**

---

## Option 2: View Secret After Creation

If you already created the webhook and need to view the secret:

### Step 1: Open Webhook Details
1. **Go to**: Account & Settings → Webhooks
2. **Click on your webhook**

### Step 2: View Secret
1. **In the details panel**, look for **"Secret"** section
2. **Click "Show Secret"** button
3. **Secret appears** (starts with `whsec_`)
4. **Copy it**

---

## Option 3: Create New Webhook with Secret

If you want to create a new webhook with a secret:

### Step 1: Create Webhook
1. **Go to**: Account & Settings → Webhooks
2. **Click "Create Webhook"**

### Step 2: Fill Details
- **Webhook URL**: `https://api.techiconnect.shop/webhooks/razorpay` (use HTTPS!)
- **Secret**: Leave empty OR create your own
- **Alert Email**: `robinsyriak07@gmail.com`
- **Events**: Select the 5 events

### Step 3: After Creation
1. **Webhook is created**
2. **Click on the webhook** to view details
3. **Click "Show Secret"** button
4. **Copy the secret**

---

## After Getting the Secret

### Add to Your Server `.env` File:

**Open**: `server/.env`

**Add**:
```bash
RAZORPAY_WEBHOOK_SECRET=whsec_your_actual_secret_here
```

**Important**: 
- ✅ Copy the ENTIRE secret (starts with `whsec_`)
- ✅ No spaces or quotes needed
- ✅ Keep it secret (never commit to Git)

### Restart Your Server:
```bash
# Stop server (Ctrl+C)
# Then start again
npm run dev
```

---

## Where to Find Secret in Razorpay Dashboard

**Path**: 
```
Razorpay Dashboard → Account & Settings → Webhooks → [Your Webhook] → Edit → Secret
```

**Look for**:
- "Show Secret" button
- "Generate Secret" button  
- "Secret" field (may be hidden - click "Show")

---

## Important Notes

### ⚠️ Secret Security
- ✅ **Never share** the secret publicly
- ✅ **Never commit** to Git (already in `.gitignore`)
- ✅ **Keep it safe** - this is used to verify webhooks

### ✅ Secret Format
- Starts with: `whsec_`
- Length: Usually 20-30 characters
- Example: `whsec_1234567890abcdef`

### ⚠️ If You Lose Secret
- You can regenerate it in Razorpay dashboard
- **BUT**: You must update `.env` file with new secret
- **AND**: Restart your server

---

## Quick Checklist

- [ ] Open Razorpay Dashboard → Webhooks
- [ ] Click on your webhook (`http://api.techiconnect.shop/webhooks/razorpay`)
- [ ] Click "Edit" button
- [ ] Find "Secret" section
- [ ] Click "Show Secret" or "Generate Secret"
- [ ] Copy the secret (starts with `whsec_`)
- [ ] Add to `server/.env` file: `RAZORPAY_WEBHOOK_SECRET=whsec_xxxxx`
- [ ] Restart your server
- [ ] Verify webhook works

---

**Your webhook secret is now configured!** 🎉

