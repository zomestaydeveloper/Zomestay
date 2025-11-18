# Setting Up Hostinger Domain for Razorpay Webhook

## Step-by-Step Guide

### Step 1: Configure DNS in Hostinger

1. **Login to Hostinger** → https://www.hostinger.com/cpanel
2. **Go to DNS Zone Editor** (or DNS Management)
3. **Add A Record**:
   ```
   Type: A
   Name: api        (or webhook, server - your choice)
   Points to: 54.160.150.74
   TTL: 3600 (or Auto)
   ```
4. **Save** and wait 5-30 minutes for DNS propagation

**Result**: `api.yourdomain.com` will point to `54.160.150.74`

---

### Step 2: Enable SSL/HTTPS (Required by Razorpay)

Razorpay requires **HTTPS** (not HTTP). You have 3 options:

#### Option A: Hostinger Free SSL (Easiest)

1. **Login to Hostinger** → **SSL Manager**
2. **Enable Free SSL** (Let's Encrypt) for `api.yourdomain.com`
3. **Enable Force HTTPS** redirect

✅ **Pros**: Free, automatic renewal
❌ **Cons**: Must have hosting with Hostinger (or use Cloudflare)

#### Option B: Cloudflare (Recommended - Free & Flexible)

1. **Sign up at Cloudflare** → https://dash.cloudflare.com/sign-up
2. **Add your domain** to Cloudflare
3. **Update nameservers** in Hostinger to Cloudflare nameservers
4. **Add DNS record** in Cloudflare:
   ```
   Type: A
   Name: api
   Content: 54.160.150.74
   Proxy: ON (orange cloud) ✅
   ```
5. **Enable SSL/TLS**:
   - Go to **SSL/TLS** → **Overview**
   - Select **Flexible** or **Full** mode
   - Cloudflare provides free HTTPS automatically

✅ **Pros**: Free, DDoS protection, CDN, always-on HTTPS
✅ **Works**: Even if you don't have hosting with Hostinger

#### Option C: Let's Encrypt on EC2 Server

If you have direct access to EC2:

1. **SSH into EC2 server**
2. **Install Certbot**:
   ```bash
   sudo apt-get update
   sudo apt-get install certbot python3-certbot-nginx
   ```
3. **Generate SSL Certificate**:
   ```bash
   sudo certbot --nginx -d api.yourdomain.com
   ```
4. **Auto-renewal** (automatic with certbot)

---

### Step 3: Verify Setup

**Test DNS propagation:**
```bash
# In PowerShell
nslookup api.yourdomain.com

# Should return: 54.160.150.74
```

**Test HTTPS:**
```bash
curl https://api.yourdomain.com/webhooks/razorpay/health
```

Should return:
```json
{"success": true, "message": "Razorpay webhook route is active", ...}
```

**If you get SSL error**, wait a few more minutes or check SSL configuration.

---

### Step 4: Configure Razorpay Webhook

**Webhook URL:**
```
https://api.yourdomain.com/webhooks/razorpay
```

**Important**: 
- ✅ Use `https://` (not `http://`)
- ✅ Use subdomain: `api.yourdomain.com` (not `www` or root domain)
- ✅ Full path: `/webhooks/razorpay`

**Events to Select:**
- ✅ `payment.captured`
- ✅ `payment.failed`
- ✅ `payment_link.paid`
- ✅ `payment_link.expired`
- ✅ `payment_link.cancelled`

**Secret:**
- Leave empty (auto-generate)
- Copy after creation → Add to `server/.env`

---

### Step 5: Update Server CORS (if needed)

If your frontend is on different domain, update `server/index.js`:

```javascript
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://zomesstay-web.onrender.com",
    "https://yourdomain.com",      // Add your domain
    "https://www.yourdomain.com"   // Add www if needed
  ],
  credentials: true
}));
```

---

## Troubleshooting

### Issue: "SSL Certificate Error"
**Solution:**
- Wait 5-10 minutes for SSL to activate
- Verify SSL is enabled in Hostinger/Cloudflare
- Check certificate is valid: https://www.ssllabs.com/ssltest/

### Issue: "Connection Refused"
**Solution:**
- Verify EC2 security group allows HTTPS (port 443) from internet
- Check server is running on port 5000
- If using nginx, verify reverse proxy is configured

### Issue: "DNS Not Resolving"
**Solution:**
- Wait longer (up to 24 hours for full propagation)
- Check DNS record is correct in Hostinger
- Clear DNS cache: `ipconfig /flushdns` (Windows)

---

## Recommended: Cloudflare Setup

**Why Cloudflare is better:**
1. ✅ Free HTTPS (automatic)
2. ✅ DDoS protection
3. ✅ CDN (faster)
4. ✅ Works with any hosting
5. ✅ Fixed IP addresses work better

**Quick Cloudflare Setup:**

1. **Add domain to Cloudflare**
2. **Point to your domain** (change nameservers)
3. **Add A record**: `api` → `54.160.150.74`
4. **Enable SSL**: SSL/TLS → Flexible
5. **Done!** → `https://api.yourdomain.com` works automatically

---

## Summary

✅ **DNS**: Point `api.yourdomain.com` → `54.160.150.74`  
✅ **SSL**: Enable via Hostinger or Cloudflare  
✅ **Webhook URL**: `https://api.yourdomain.com/webhooks/razorpay`  
✅ **Test**: `curl https://api.yourdomain.com/webhooks/razorpay/health`  
✅ **Configure**: Add URL in Razorpay dashboard

**After setup, you'll have a permanent, secure webhook URL!** 🎉

