# Razorpay Webhook Testing Guide

## ✅ Quick Start - Test Webhook Now

### Step 1: Start Your Server
```bash
cd server
npm run dev
```

Verify server is running:
```bash
curl http://localhost:5000/webhooks/razorpay/health
```

Should return:
```json
{
  "success": true,
  "message": "Razorpay webhook route is active",
  "timestamp": "2024-01-XX...",
  "path": "/webhooks/razorpay"
}
```

---

## 🧪 Method 1: Test Locally with ngrok (Recommended)

### Install ngrok
```bash
# Download from https://ngrok.com/download
# Or using npm:
npm install -g ngrok
```

### Start ngrok tunnel
```bash
ngrok http 5000
```

You'll get output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:5000
```

### Configure Razorpay Webhook

1. **Login to Razorpay Dashboard**: https://dashboard.razorpay.com
2. **Go to Settings → Webhooks**
3. **Add Webhook URL**:
   ```
   https://abc123.ngrok.io/webhooks/razorpay
   ```
4. **Select Events** (check all):
   - ✅ `payment.captured`
   - ✅ `payment.failed`
   - ✅ `payment_link.paid`
   - ✅ `payment_link.expired`
   - ✅ `payment_link.cancelled`
5. **Copy Webhook Secret**:
   - Click on the webhook → Copy "Secret"
   - It looks like: `whsec_xxxxx`

### Set Environment Variable
```bash
# In server/.env file
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxx
```

**Important**: Restart server after setting environment variable!

---

## 🧪 Method 2: Test with Postman/cURL (Manual Testing)

### Get Webhook Secret from Razorpay
1. Go to Razorpay Dashboard → Settings → Webhooks
2. Copy the webhook secret (starts with `whsec_`)

### Test Webhook Endpoint

#### Test 1: Health Check
```bash
curl http://localhost:5000/webhooks/razorpay/health
```

#### Test 2: Manual Webhook Call (with signature)

**Create a test webhook payload** (save as `test-webhook.json`):
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_test_ABC123",
        "order_id": "order_test_XYZ789",
        "status": "captured",
        "amount": 50000,
        "currency": "INR",
        "created_at": 1234567890
      }
    }
  }
}
```

**Generate signature** (in Node.js):
```javascript
const crypto = require('crypto');
const webhookSecret = 'whsec_xxxxx'; // Your webhook secret
const payload = JSON.stringify(require('./test-webhook.json'));
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex');

console.log('Signature:', signature);
```

**Send webhook request**:
```bash
curl -X POST http://localhost:5000/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: YOUR_SIGNATURE_HERE" \
  -d @test-webhook.json
```

---

## 📋 Testing Checklist

### ✅ Prerequisites
- [ ] Server is running on `localhost:5000`
- [ ] Webhook route is registered: `GET /webhooks/razorpay/health` returns 200
- [ ] `RAZORPAY_WEBHOOK_SECRET` is set in `.env` file
- [ ] Server restarted after setting webhook secret

### ✅ Test Scenarios

#### Scenario 1: Test Payment Link Creation
1. Create payment link from FrontDesk dashboard
2. Copy the payment link URL
3. Open payment link in browser
4. Complete payment with test card: `4111 1111 1111 1111`
5. **Check**: Webhook should receive `payment_link.paid` event
6. **Verify**: Booking created in database
7. **Verify**: Dashboard auto-refreshes and shows booking

#### Scenario 2: Test Direct Payment (User/Agent)
1. Go to property details page
2. Select room and proceed to payment
3. Complete Razorpay checkout
4. **Check**: Webhook should receive `payment.captured` event
5. **Verify**: Booking created in database
6. **Verify**: Frontend polling shows booking confirmed

#### Scenario 3: Test Payment Failure
1. Start payment process
2. Cancel payment or use invalid card
3. **Check**: Webhook should receive `payment.failed` event
4. **Verify**: Order status updated to `FAILED`
5. **Verify**: Rooms released (if any holds)

#### Scenario 4: Test Payment Link Expiry
1. Create payment link
2. Wait for expiry (or manually expire in Razorpay dashboard)
3. **Check**: Webhook should receive `payment_link.expired` event
4. **Verify**: Order status updated to `EXPIRED`
5. **Verify**: Rooms released

---

## 🔍 Debugging

### Check Server Logs
```bash
# Watch server logs in real-time
npm run dev
```

**Look for**:
- `[WEBHOOK-xxxxx] Handling payment.captured event`
- `[WEBHOOK-xxxxx] ✅ Payment captured: Order xxx → Booking xxx`
- `[WEBHOOK-xxxxx] ❌ Error handling webhook`

### Check Razorpay Dashboard
1. Go to **Settings → Webhooks**
2. Click on your webhook
3. Check **Event Logs**:
   - ✅ Green = Success (200 response)
   - ❌ Red = Failed (non-200 response)
   - ⚠️ Yellow = Retrying

### Common Issues

#### Issue 1: "Signature verification failed"
**Solution**:
- Check `RAZORPAY_WEBHOOK_SECRET` matches Razorpay dashboard
- Ensure webhook secret starts with `whsec_`
- Restart server after setting environment variable

#### Issue 2: "Webhook not receiving events"
**Solution**:
- Verify ngrok URL is correct in Razorpay dashboard
- Check ngrok is still running (URL changes on restart)
- Verify events are selected in Razorpay dashboard
- Check server logs for incoming requests

#### Issue 3: "Order not found"
**Solution**:
- Verify order exists with matching `razorpayOrderId`
- Check database: `SELECT * FROM orders WHERE razorpayOrderId = 'xxx'`
- Ensure order was created before payment

#### Issue 4: "Booking not created"
**Solution**:
- Check server logs for errors
- Verify database connection
- Check order has `roomSelections`
- Verify `bookingCreation.service.js` is working

---

## 📊 Test Data

### Test Cards (Razorpay Test Mode)

**Success Cards**:
- `4111 1111 1111 1111` - Any CVV, Any expiry
- `5104 0600 0000 0008` - Mastercard

**Failure Cards**:
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 9995` - Insufficient funds

### Test UPI IDs
- `success@razorpay` - Always succeeds
- `failure@razorpay` - Always fails

---

## 🚀 Production Deployment

### Step 1: Get Production Webhook Secret
1. Switch Razorpay to **Live Mode**
2. Go to **Settings → Webhooks**
3. Create webhook for production URL
4. Copy production webhook secret (different from test)

### Step 2: Set Production Environment
```bash
# Production .env
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_prod_xxxxx
```

### Step 3: Configure Webhook URL
```
Production URL: https://your-domain.com/webhooks/razorpay
```

### Step 4: Test Production Webhook
1. Make a test payment with small amount
2. Verify webhook receives event
3. Check booking created correctly
4. Monitor logs for any errors

---

## 📝 Monitoring

### What to Monitor

1. **Webhook Response Time**:
   - Should be < 2 seconds
   - If slow, check database queries

2. **Webhook Success Rate**:
   - Target: > 99%
   - Check Razorpay dashboard event logs

3. **Error Logs**:
   - Monitor server logs for webhook errors
   - Set up alerts for repeated failures

4. **Database Consistency**:
   - Verify bookings are created
   - Check order status matches payment status

---

## ✅ Success Indicators

After testing, you should see:

1. ✅ **Health check returns 200**
2. ✅ **Webhook receives events from Razorpay**
3. ✅ **Bookings created automatically**
4. ✅ **Dashboard shows bookings within 30 seconds**
5. ✅ **No errors in server logs**
6. ✅ **Order status updated correctly**

---

## 🔗 Related Files

- Webhook Route: `server/src/routes/webhooks/razorpay.routes.js`
- Webhook Controller: `server/src/controllers/payment/webhook.controller.js`
- Webhook Verification: `server/src/services/payment/webHookVerification.service.js`
- Booking Creation: `server/src/services/payment/bookingCreation.service.js`

---

## 📞 Support

If webhook testing fails:
1. Check server logs first
2. Verify Razorpay dashboard event logs
3. Test health endpoint: `GET /webhooks/razorpay/health`
4. Verify environment variables are set correctly
5. Check database connectivity

---

**Last Updated**: 2024-01-XX  
**Status**: ✅ Ready for Testing

