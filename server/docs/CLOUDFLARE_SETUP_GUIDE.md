# Cloudflare Setup Guide for techiconnect.shop

## Step-by-Step: Add Cloudflare SSL to Your Existing Domain

### Step 1: Sign Up for Cloudflare (Free)

1. **Go to**: https://dash.cloudflare.com/sign-up
2. **Sign up** with your email (free account is enough)
3. **Verify your email**

---

### Step 2: Add Your Domain to Cloudflare

1. **Login to Cloudflare Dashboard**
2. **Click "Add a Site"** (top right)
3. **Enter your domain**: `techiconnect.shop`
4. **Select Plan**: Choose **FREE** plan
5. **Click "Continue"**

---

### Step 3: Review DNS Records

Cloudflare will scan your existing DNS records. You'll see:
- ✅ Your `api` A record (54.160.150.74) should appear
- ✅ Your `www` CNAME record should appear

**Verify:**
- ✅ `api` → `A` → `54.160.150.74` is listed
- If not, you can add it later in Cloudflare

**Click "Continue"**

---

### Step 4: Update Nameservers in Hostinger

**Important**: Cloudflare will give you 2 nameservers. You need to update these in Hostinger.

**What you'll see in Cloudflare:**
```
Nameserver 1: alice.ns.cloudflare.com
Nameserver 2: bob.ns.cloudflare.com
```
(These will be different for your domain - copy the exact ones shown)

**Steps in Hostinger:**
1. **Login to Hostinger** → **Domain** → `techiconnect.shop`
2. **Go to DNS / Nameservers** section
3. **Change nameservers** to **Custom**
4. **Enter Cloudflare nameservers**:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
   (Use the EXACT nameservers Cloudflare shows you)
5. **Save**

**Wait 5-30 minutes** for DNS propagation.

---

### Step 5: Complete Cloudflare Setup

1. **Go back to Cloudflare dashboard**
2. **Click "Continue"** (after updating nameservers)
3. Cloudflare will verify nameserver update
4. Once verified → **Your domain is active!**

---

### Step 6: Configure DNS Records in Cloudflare

1. **Go to**: DNS → Records
2. **Verify/Add records**:

   **A Record (for webhook):**
   ```
   Type: A
   Name: api
   Content: 54.160.150.74
   Proxy: ON (orange cloud) ✅ IMPORTANT!
   TTL: Auto
   ```

   **CNAME Record (for www):**
   ```
   Type: CNAME
   Name: www
   Target: techiconnect.shop
   Proxy: ON (orange cloud) ✅
   TTL: Auto
   ```

**Important**: 
- ✅ **Proxy: ON** (orange cloud) = HTTPS enabled automatically
- ❌ **Proxy: OFF** (gray cloud) = No HTTPS

---

### Step 7: Enable SSL/TLS (Automatic with Cloudflare)

1. **Go to**: SSL/TLS → Overview
2. **Select SSL/TLS encryption mode**:
   - **"Flexible"** = Cloudflare ↔ Visitor (HTTPS) | Cloudflare ↔ Server (HTTP)
   - **"Full"** = Cloudflare ↔ Visitor (HTTPS) | Cloudflare ↔ Server (HTTPS)
   
   **For now, choose "Flexible"** (works with HTTP server)

3. **That's it!** SSL is now enabled automatically ✅

---

### Step 8: Verify HTTPS Works

**Test your webhook endpoint:**
```bash
curl https://api.techiconnect.shop/webhooks/razorpay/health
```

Should return:
```json
{
  "success": true,
  "message": "Razorpay webhook route is active",
  ...
}
```

**If you get an error**, wait 5-10 more minutes for SSL certificate to be issued.

---

### Step 9: Configure Razorpay Webhook

**Webhook URL:**
```
https://api.techiconnect.shop/webhooks/razorpay
```

**Events to Select:**
- ✅ `payment.captured`
- ✅ `payment.failed`
- ✅ `payment_link.paid`
- ✅ `payment_link.expired`
- ✅ `payment_link.cancelled`

**Secret:**
- Leave empty (auto-generate)
- Copy after creation → Add to `server/.env`:
  ```
  RAZORPAY_WEBHOOK_SECRET=whsec_xxxxx
  ```

---

## Quick Summary

1. ✅ **Sign up Cloudflare** (free)
2. ✅ **Add domain**: `techiconnect.shop`
3. ✅ **Update nameservers** in Hostinger to Cloudflare
4. ✅ **Enable Proxy** (orange cloud) for `api` record
5. ✅ **Select SSL mode**: "Flexible"
6. ✅ **Done!** → `https://api.techiconnect.shop` works!

---

## Important Notes

### ✅ Keep Proxy ON (Orange Cloud)
- This enables HTTPS automatically
- Provides DDoS protection
- Free CDN included

### ⚠️ DNS Propagation
- Takes 5-30 minutes
- Your domain might be unreachable briefly during switch
- Check status: https://dash.cloudflare.com → Your domain

### 🔒 SSL Certificate
- Automatically issued by Cloudflare (free)
- Takes 5-10 minutes after setup
- Auto-renewal (no action needed)

---

## Troubleshooting

### Issue: "Nameserver update failed"
**Solution:**
- Double-check nameservers are exactly as shown in Cloudflare
- Wait longer (up to 24 hours for full propagation)
- Verify in Hostinger they're saved correctly

### Issue: "SSL certificate not active yet"
**Solution:**
- Wait 5-10 more minutes
- Ensure Proxy is ON (orange cloud) for your records
- Check SSL/TLS mode is set (not "Off")

### Issue: "Connection refused"
**Solution:**
- Verify server is running on EC2: `54.160.150.74:5000`
- Check EC2 security group allows HTTPS (port 443) from Cloudflare IPs
- Verify DNS record points to correct IP

---

## After Setup

Your webhook URL will be:
```
https://api.techiconnect.shop/webhooks/razorpay
```

✅ **HTTPS enabled** (required by Razorpay)  
✅ **Free SSL certificate** (automatic)  
✅ **DDoS protection** (included)  
✅ **CDN** (faster responses)

**You're ready to configure Razorpay webhook!** 🎉

