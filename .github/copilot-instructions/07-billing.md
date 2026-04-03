# Paddle Billing (Prepaid Credits Only)

The app uses **Paddle** for payment processing with a **prepaid credits** model only. Metered/subscription billing has been removed.

## Pricing Model
- **$1 USD = 1 Credit** (simple 1:1 mapping)
- **Minimum**: $20
- **Maximum**: $10,000
- All prices in **USD only** (no INR)

---

## Key Files
| File | Purpose |
|------|---------|
| `frontend/services/paddleService.ts` | Paddle checkout, initialization |
| `frontend/components/billing/BuyCreditsModal.tsx` | Purchase modal with success/failed states |
| `backend/routes/paddle.js` | Webhook handler, transaction creation |

---

## Frontend Flow
```
1. User clicks "Add Funds" → BuyCreditsModal opens
2. User enters amount → createPaddleTransaction (backend)
3. Backend creates pending transaction in payment_transactions table
4. Paddle checkout overlay opens
5. On success → successCallback triggers → shows success dialog
6. On "Done" click → page refreshes to show new balance
7. Webhook processes in background → adds credits via add_credits RPC
```

---

## Webhook Configuration
- **Destination**: `https://voicory-backend-783942490798.asia-south1.run.app/api/paddle/webhook`
- **Events**: `transaction.completed` only
- **Secret**: Set via `PADDLE_WEBHOOK_SECRET` env var on Cloud Run

## Important: Webhook Body Handling
The webhook handler must handle both raw and JSON-parsed bodies because `express.json()` middleware runs before the route:

```javascript
// backend/routes/paddle.js
router.post('/webhook', async (req, res) => {
    let event;
    if (Buffer.isBuffer(req.body)) {
        event = JSON.parse(req.body.toString());
    } else if (typeof req.body === 'object') {
        event = req.body;  // Already parsed by express.json()
    }
    // ... process event
});
```

---

## Database Tables
| Table | Purpose |
|-------|---------|
| `payment_transactions` | Pending/completed transactions |
| `credit_transactions` | Credit ledger (purchases, usage) |
| `user_profiles.credits_balance` | Current balance |

## Add Credits RPC
Use the function with `p_metadata` parameter to store Paddle transaction IDs:

```javascript
await supabase.rpc('add_credits', {
    p_user_id: userId,
    p_amount: credits,
    p_transaction_type: 'purchase',
    p_description: `Credit purchase via Paddle - ${credits} credits`,
    p_reference_type: 'paddle_transaction',
    p_reference_id: null,  // Paddle IDs are strings, not UUIDs
    p_metadata: { paddle_transaction_id: transaction.id }
});
```

---

## Environment Variables (Paddle)
```env
PADDLE_API_KEY=pdl_sdbx_apikey_...
PADDLE_CLIENT_TOKEN=test_f21c99da...
PADDLE_WEBHOOK_SECRET=pdl_ntfset_...
PADDLE_ENVIRONMENT=production  # or 'production'
PADDLE_PRICE_ID=pri_01kckx3pts...  # $1 per unit price
```

---

## Modal States
The `BuyCreditsModal` has 4 states:
1. **amount** - Enter purchase amount
2. **processing** - Loading during checkout
3. **success** - Payment successful, shows "Done" button (refreshes page)
4. **failed** - Payment failed, shows "Try Again" and "Close" buttons

---

## Pitfalls to Avoid
- ❌ **Don't use `successUrl`** in Paddle checkout - prevents success dialog from showing
- ❌ **Don't use `express.raw()`** middleware - conflicts with global `express.json()`
- ❌ **Don't pass Paddle transaction ID as `p_reference_id`** - it's a string, not UUID
- ✅ **Do use `p_metadata`** to store Paddle transaction IDs
