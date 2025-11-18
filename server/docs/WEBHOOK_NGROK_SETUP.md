# Using ngrok for Webhook Testing

## Problem
Razorpay doesn't accept IP addresses like `http://54.160.150.74/webhooks/razorpay`
Razorpay requires: **Domain name with HTTPS**

## Solution: Use ngrok (Free & Easy)

### Step 1: Install ngrok

**Windows (PowerShell):**
```powershell
# Using Chocolatey (if installed)
choco install ngrok

# Or download from: https://ngrok.com/download
# Extract to a folder and add to PATH
```

**Or Download:**
1. Go to https://ngrok.com/download
2. Download Windows version
3. Extract `ngrok.exe` to a folder
4. Add to PATH or use full path

### Step 2: Create ngrok Account (Free)
1. Go to https://dashboard.ngrok.com/signup
2. Sign up (free account works)
3. Copy your **Authtoken** from dashboard

### Step 3: Authenticate ngrok
```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

### Step 4: Start ngrok Tunnel

**If server is on EC2 (54.160.150.74):**
```bash
# SSH into your EC2 server first
ssh -i your-key.pem ubuntu@54.160.150.74

# On EC2, start ngrok
ngrok http 5000
```

**If server is on localhost:**
```bash
# Start your server first
cd server
npm run dev

# In another terminal, start ngrok
ngrok http 5000
```

You'll see output like:
```
Forwarding    https://abc123xyz.ngrok-free.app -> http://localhost:5000
```

### Step 5: Use ngrok URL in Razorpay

**Webhook URL:**
```
https://abc123xyz.ngrok-free.app/webhooks/razorpay
```

**Important Notes:**
- ngrok URL changes every time you restart ngrok (free plan)
- For production, use a fixed domain name
- Keep ngrok running while testing

### Step 6: Configure Razorpay Webhook

1. **Webhook URL**: `https://abc123xyz.ngrok-free.app/webhooks/razorpay`
2. **Events**: Select the 5 events mentioned
3. **Secret**: Leave empty (auto-generate)
4. Click "Create Webhook"

---

## Keep ngrok Running

**On Windows (PowerShell):**
```powershell
# Run in background (keep terminal open)
Start-Process ngrok -ArgumentList "http", "5000"
```

**On EC2 (Linux):**
```bash
# Use screen or tmux to keep it running
screen -S ngrok
ngrok http 5000
# Press Ctrl+A, then D to detach

# To reattach later
screen -r ngrok
```

---

## Production Solution

For production, you need a **real domain name**:

1. **Buy/Use Domain**: `yourdomain.com`
2. **Point to EC2**: 
   ```
   api.yourdomain.com → 54.160.150.74 (A record)
   ```
3. **Setup HTTPS** (Required by Razorpay):
   - Use **Let's Encrypt** (free SSL)
   - Or use **AWS Certificate Manager** with Load Balancer
   - Or use **Cloudflare** (free SSL proxy)

4. **Webhook URL**:
   ```
   https://api.yourdomain.com/webhooks/razorpay
   ```

---

## Quick Comparison

| Solution | Cost | Use Case | HTTPS | Fixed URL |
|----------|------|----------|-------|-----------|
| ngrok (Free) | Free | Testing | ✅ Yes | ❌ Changes each restart |
| ngrok (Paid) | $8/month | Staging | ✅ Yes | ✅ Fixed URL |
| Real Domain | Domain cost | Production | ✅ Yes (Let's Encrypt) | ✅ Fixed |

---

## Recommendation

1. **For Testing Now**: Use ngrok (free) → Quick setup
2. **For Production**: Set up real domain with HTTPS → Professional & permanent

