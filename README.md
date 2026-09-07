# Coursellm API (Phase 4 — Checkout + Razorpay)

## Payments
Set in `backend/.env`:

```env
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

Use `PAYMENT_PROVIDER=demo` to force the old fake gateway path (`POST /api/checkout/complete`).

### Razorpay plan purchase flow
1. `POST /api/checkout/create-order` → pending Mongo order + Razorpay order  
2. Frontend opens Razorpay Checkout (UPI / card / netbanking)  
3. `POST /api/checkout/verify` → signature check → create student + set `planSlug` → JWT + receipt  

Plan billing is a **one-time payment** that unlocks the bundle (subscription/plan enrollment). Recurring monthly renewals are not enabled yet.

## Setup
```bash
cd backend
npm install
npm run dev
```

Swagger: http://localhost:5000/api/docs
