# Paddle Payment Integration Guide

## Overview

Voicory uses **Paddle** as the Merchant of Record (MoR) for payments. This means:
- Paddle handles all tax compliance (GST, VAT, sales tax)
- Paddle handles invoicing and receipts
- Paddle handles payment processing
- Paddle handles refunds and disputes
- **You focus on building your product**

### Why Paddle for Per-Usage/Credit-Based Billing?

Unlike subscription models, Voicory uses a **credit-based (per-usage)** billing model:
- Users buy credit packages (one-time purchases)
- Credits are consumed as they use AI voice/chat services
- No recurring subscriptions needed
- Perfect for usage-based SaaS products

---

## 🚀 Quick Start Setup

### Step 1: Create Paddle Account

1. Go to [Paddle.com](https://www.paddle.com/) and sign up
2. Choose **Paddle Billing** (not Paddle Classic)
3. Complete the verification process (see below)

### Step 2: Get Your API Keys

From your Paddle Dashboard:

1. **Client Token** (safe to expose in frontend)
   - Settings → API Keys → Client-side token
   - Used for Paddle.js initialization

2. **API Key** (keep secret - backend only)
   - Settings → API Keys → API Key
   - Used for server-side verification

3. **Webhook Secret** (keep secret)
   - Settings → Webhooks → Create webhook
   - Webhook URL: `https://api.voicory.com/api/paddle/webhook`
   - Secret is generated when you create the webhook

### Step 3: Create Products & Prices

In Paddle Dashboard → Catalog → Products:

Create **ONE product** for credits, then multiple **prices** for each package:

**Product**: "Voicory Credits"
- Product ID: `pro_voicorycredits` (auto-generated)

**Prices** (create one for each package/currency):

| Package | USD Price ID | INR Price ID | Credits |
|---------|--------------|--------------|---------|
| Starter | `pri_starter_usd` | `pri_starter_inr` | 100 |
| Basic | `pri_basic_usd` | `pri_basic_inr` | 500 |
| Popular | `pri_popular_usd` | `pri_popular_inr` | 1000 |
| Pro | `pri_pro_usd` | `pri_pro_inr` | 2500 |
| Business | `pri_business_usd` | `pri_business_inr` | 5000 |
| Enterprise | `pri_enterprise_usd` | `pri_enterprise_inr` | 10000 |

**Important**: For each price:
- Set **Type**: "One-time" (NOT recurring/subscription)
- Set **Price** in the appropriate currency
- Enable the price for checkout

### Step 4: Set Environment Variables

**Backend (.env / Cloud Run):**
```env
# Paddle Configuration
PADDLE_API_KEY=your_api_key_here
PADDLE_CLIENT_TOKEN=your_client_token_here
PADDLE_WEBHOOK_SECRET=your_webhook_secret_here
PADDLE_ENVIRONMENT=sandbox  # Change to 'production' when live

# Paddle Price IDs (from your dashboard)
PADDLE_PRICE_STARTER_USD=pri_xxxxxxxx
PADDLE_PRICE_STARTER_INR=pri_xxxxxxxx
PADDLE_PRICE_BASIC_USD=pri_xxxxxxxx
PADDLE_PRICE_BASIC_INR=pri_xxxxxxxx
PADDLE_PRICE_POPULAR_USD=pri_xxxxxxxx
PADDLE_PRICE_POPULAR_INR=pri_xxxxxxxx
PADDLE_PRICE_PRO_USD=pri_xxxxxxxx
PADDLE_PRICE_PRO_INR=pri_xxxxxxxx
PADDLE_PRICE_BUSINESS_USD=pri_xxxxxxxx
PADDLE_PRICE_BUSINESS_INR=pri_xxxxxxxx
PADDLE_PRICE_ENTERPRISE_USD=pri_xxxxxxxx
PADDLE_PRICE_ENTERPRISE_INR=pri_xxxxxxxx
```

**Frontend (.env):**
```env
# No Paddle keys needed in frontend!
# The backend provides the client token via /api/paddle/config
```

### Step 5: Configure Webhook

In Paddle Dashboard → Webhooks:

1. Create new webhook
2. Set URL: `https://api.voicory.com/api/paddle/webhook`
3. Select events:
   - `transaction.completed` ✅ (most important)
   - `transaction.payment_failed` ✅
   - `transaction.canceled` ✅
4. Save and copy the webhook secret

---

## 📋 Paddle Verification Requirements

### Documents Required for India-based Business

Paddle requires verification before you can go live. Here's what you need:

#### 1. **Business Documents**
| Document | Details |
|----------|---------|
| **Company Registration** | Certificate of Incorporation (COI) |
| **GST Registration** | GSTIN certificate |
| **PAN Card** | Company PAN card |
| **Address Proof** | Utility bill or bank statement (last 3 months) |

#### 2. **Director/Owner Documents**
| Document | Details |
|----------|---------|
| **ID Proof** | Passport, Aadhaar, or Voter ID |
| **Address Proof** | Utility bill or bank statement |
| **Selfie** | Clear photo holding ID |

#### 3. **Business Information**
| Question | Your Answer Template |
|----------|----------------------|
| **Business Model** | "We provide AI-powered voice and chat automation services. Customers purchase credits which are consumed based on usage (per-minute for voice calls, per-message for chat)." |
| **Target Market** | "Small to medium businesses in India and globally who need customer support automation, appointment booking, and lead qualification." |
| **Average Transaction** | "₹799 - ₹5,999 INR ($10 - $72 USD)" |
| **Monthly Volume** | "Expected ₹50,000 - ₹5,00,000 INR in the first year" |

### Timeline
- Initial submission: 1-2 business days
- Additional documents (if requested): 2-5 business days
- Final approval: 1-2 weeks total

---

## 📄 Required Legal Pages

Paddle requires these legal pages on your website. Here's what you need:

### 1. Terms of Service (`/terms`)

**Required Sections:**
- Service description
- Account terms
- Payment terms (mention Paddle as payment processor)
- Usage policy
- Intellectual property
- Termination
- Liability limits
- Governing law

**Template clause for payments:**
```
Payment Processing: All payments are processed securely by Paddle.com 
(Paddle), our merchant of record. Paddle handles all payment processing, 
invoicing, tax collection, and compliance on our behalf. By making a 
purchase, you agree to Paddle's terms of service and privacy policy.
```

### 2. Privacy Policy (`/privacy`)

**Required Sections:**
- Data collection (what you collect)
- Data usage (how you use it)
- Data sharing (mention Paddle receives payment info)
- Cookies
- Data retention
- User rights (GDPR/CCPA compliance)
- Contact information

**Template clause for Paddle:**
```
Payment Information: When you make a purchase, payment information is 
collected and processed by our payment processor, Paddle.com. We do not 
store your full credit card details on our servers. Please refer to 
Paddle's privacy policy for information on how they handle your data.
```

### 3. Refund Policy (`/refund`)

**Required Sections:**
- Refund eligibility
- Refund timeframe
- How to request refunds
- Non-refundable items
- Processing time

**Recommended policy for credits:**
```
Credit Refunds:
- Unused credits may be refunded within 7 days of purchase
- Partially used credit packages are non-refundable
- Refunds are processed to the original payment method
- Processing time: 5-10 business days

To request a refund, contact support@voicory.com with your order details.
```

### 4. Cookie Policy (`/cookies`) - Optional but Recommended

Simple page explaining:
- What cookies you use
- Why you use them
- How users can control cookies

---

## 🔧 Technical Implementation

### Backend Routes (`/api/paddle/*`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/paddle/config` | GET | No | Returns client token & environment |
| `/api/paddle/packages` | GET | No | Returns credit packages with prices |
| `/api/paddle/create-transaction` | POST | Yes | Creates pending transaction |
| `/api/paddle/verify-transaction` | POST | Yes | Verifies completed transaction |
| `/api/paddle/webhook` | POST | No* | Handles Paddle webhooks |
| `/api/paddle/transaction/:id` | GET | Yes | Gets transaction status |

*Webhook uses signature verification instead of JWT auth

### Payment Flow

```
1. User selects package → Frontend
2. Create transaction → POST /api/paddle/create-transaction
3. Open Paddle overlay → Paddle.js Checkout.open()
4. User completes payment → Paddle
5. Paddle sends webhook → POST /api/paddle/webhook
6. Add credits to user → Database
7. Show success → Frontend
```

### Frontend Integration

```typescript
import { openPaddleCheckout } from '@/services/paddleService';

// Open Paddle checkout
await openPaddleCheckout(
  'popular',        // package ID
  'INR',            // currency
  (result) => {     // onSuccess
    console.log('Credits added:', result.credits);
  },
  (error) => {      // onError
    console.error('Payment failed:', error);
  }
);
```

---

## 🧪 Testing in Sandbox

### Sandbox Mode

1. Set `PADDLE_ENVIRONMENT=sandbox` in backend
2. Use Paddle sandbox API keys
3. Test credit cards:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - Any future expiry date, any CVC

### Test Webhook Locally

Use ngrok or similar:
```bash
ngrok http 3001
# Update Paddle webhook URL to ngrok URL temporarily
```

---

## 🚀 Going Live Checklist

- [ ] Complete Paddle business verification
- [ ] Upload all required documents
- [ ] Create production API keys
- [ ] Create production prices for all packages
- [ ] Set up production webhook URL
- [ ] Update environment variables to production
- [ ] Set `PADDLE_ENVIRONMENT=production`
- [ ] Test one real transaction (small amount)
- [ ] Verify credits are added correctly
- [ ] Verify webhook is working
- [ ] Update legal pages with Paddle mentions

---

## 💰 Paddle Pricing

Paddle charges:
- **5% + $0.50** per transaction (standard rate)
- No monthly fees
- No setup fees
- Includes: Payment processing, tax compliance, invoicing, fraud protection

For high volume, contact Paddle for custom pricing.

---

## 🆘 Support

- **Paddle Support**: support@paddle.com
- **Paddle Docs**: https://developer.paddle.com/
- **Paddle Status**: https://status.paddle.com/

---

## Environment Variables Summary

### Backend (Cloud Run / .env)
```env
# Required
PADDLE_API_KEY=
PADDLE_CLIENT_TOKEN=
PADDLE_WEBHOOK_SECRET=
PADDLE_ENVIRONMENT=sandbox

# Price IDs (create in Paddle dashboard)
PADDLE_PRICE_STARTER_USD=
PADDLE_PRICE_STARTER_INR=
PADDLE_PRICE_BASIC_USD=
PADDLE_PRICE_BASIC_INR=
PADDLE_PRICE_POPULAR_USD=
PADDLE_PRICE_POPULAR_INR=
PADDLE_PRICE_PRO_USD=
PADDLE_PRICE_PRO_INR=
PADDLE_PRICE_BUSINESS_USD=
PADDLE_PRICE_BUSINESS_INR=
PADDLE_PRICE_ENTERPRISE_USD=
PADDLE_PRICE_ENTERPRISE_INR=
```

### Frontend
No Paddle-specific environment variables needed! The backend provides the client token securely.
