# Expense Tracker Backend

NestJS backend for parsing receipt images and tracking expenses.

## Features

- Receipt image parsing via AI (Gemini or Claude Code CLI)
- Multi-app support: Gojek, OVO, BCA, Grab, Dana, Jenius, Jago, Danamon
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

## API Endpoints

### Transactions

- `POST /transactions/upload` - Parse receipt image
- `POST /transactions/confirm` - Save parsed transactions
- `GET /transactions/history` - Get transaction history
- `PUT /transactions/:id` - Update transaction
- `DELETE /transactions/:id` - Delete transaction

### Config

- `GET /config` - Get categories, users, payment methods
