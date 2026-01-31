# Expense Tracker Backend

NestJS backend for parsing receipt images and tracking expenses.

## Features

- Receipt image parsing via AI (Gemini or Claude Code CLI)
- Multi-app support: Gojek, OVO, BCA, Grab, Dana, Jenius, Jago, Danamon, Mandiri CC
- Automatic category detection with merchant-based overrides
- MinIO storage for receipt images
- PostgreSQL database with Drizzle ORM

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL
- MinIO (or S3-compatible storage)
- Claude CLI (optional, for claude-code provider)

### Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/exp_track
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_BUCKET=receipts
AI_PROVIDER=gemini|claude-code
GOOGLE_API_KEY=...  # Required for gemini provider
```

### Installation

```bash
pnpm install
pnpm db:push
pnpm start:dev
```

## AI Providers

### Gemini (Default)

- Uses Google's Gemini 2.5 Flash API
- Requires `GOOGLE_API_KEY`
- Fast (~1-3s per image)

### Claude Code CLI

- Uses Claude Code CLI with Max subscription
- No API costs
- Slower (~10-30s per image)
- Requires `claude` CLI installed and authenticated

Switch providers via `AI_PROVIDER` env var.

## Category Overrides

Merchant-based rules override AI categorization:

| Merchant Pattern | Category | Description |
|------------------|----------|-------------|
| MA RUF | Fashion | Haircut |
| LINK NET | Utilities | WiFi |
| WAHYUDI | Meals | Mie Aceh |
| ADMAN RESKYANSYAH | Groceries | Drinking water |
| TATYANA | Utilities | Bills |

Edit `src/modules/parser/category-overrides.ts` to add more rules.

## CC Forwarding Feature

When paying via Grab/Gojek using a credit card, two transactions are recorded:
1. The app transaction (Grab/Gojek) showing the purchase
2. The CC statement showing the charge

This creates duplicate expenses in totals. The CC forwarding feature links these transactions:

- **On upload**: CC transactions from Mandiri CC are parsed with `forwardedFromApp` field (e.g., "Grab", "Gojek")
- **Matching**: System finds potential app transactions to link based on amount and date
- **Linking**: When linked, the CC transaction is excluded from expense totals
- **Category sync**: Linked transactions share the same category - updating one updates the other

### Supported CC Forwarding

| CC Source | Detected Apps |
|-----------|---------------|
| Mandiri CC | Grab, Gojek |

## API Endpoints

### Transactions

- `POST /transactions/upload` - Parse receipt image
- `POST /transactions/confirm` - Save parsed transactions
- `GET /transactions/history` - Get transaction history
- `PUT /transactions/:id` - Update transaction
- `DELETE /transactions/:id` - Delete transaction
- `POST /transactions/link-forwarded` - Link CC transaction to app transaction
- `DELETE /transactions/:id/unlink-forwarded` - Unlink CC transaction from app
- `POST /transactions/check-forwarded-matches` - Find potential CC-to-app matches
- `POST /transactions/check-reverse-forwarded-matches` - Find existing CC transactions for app upload

### Config

- `GET /config` - Get categories, users, payment methods
