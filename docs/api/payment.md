# Payment API

Base URL: `http://localhost:8003`

## Endpoints

### POST /api/v1/checkout/create-session
Create a Stripe Checkout session.

### POST /api/v1/checkout/verify-receipt
Validate Apple/Google purchase receipts.

### POST /api/v1/webhook/stripe
Stripe webhook handler.

### GET /api/v1/battlepass/current
Current Battle Pass season info (10-week seasons).

### GET /api/v1/battlepass/{user_id}/progress
Player's Battle Pass progression.

### POST /api/v1/battlepass/{user_id}/claim
Claim Battle Pass tier reward.

### GET /health
Health check.
