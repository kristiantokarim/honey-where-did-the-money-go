# EXP_TRACK - Expense Tracking Application

A full-stack expense tracking application with AI-powered receipt scanning. Built for tracking shared household expenses with support for Indonesian e-money payment apps (Gojek, OVO, BCA, Grab).

## Tech Stack

- **Backend**: NestJS, TypeScript, PostgreSQL, Drizzle ORM, MinIO, Google Gemini AI
- **Frontend**: React 19, TypeScript, TanStack Router, Vite, Tailwind CSS, Axios

---

## Prerequisites

- Node.js 18+
- pnpm (or npm)
- Docker & Docker Compose
- Google Gemini API key

---

## Quick Start

### 1. Start Infrastructure (PostgreSQL + MinIO)

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port `5432` (database)
- **MinIO** on ports `9000` (API) and `9001` (console)

### 2. Backend Setup

```bash
cd backend

# Install dependencies
pnpm install

# Configure environment (edit .env with your API key)
cp .env.example .env

# Run database migration
pnpm drizzle-kit push

# Start the server
pnpm start:dev
```

The backend runs on `http://localhost:3000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

The frontend runs on `http://localhost:5173`

---

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://exp_track:exp_track_password@localhost:5432/exp_track

# MinIO (Object Storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minio_admin
MINIO_SECRET_KEY=minio_password
MINIO_BUCKET=receipts
MINIO_USE_SSL=false

# Google AI
GOOGLE_API_KEY=your_gemini_api_key_here
```

---

## Features

### Receipt Scanning (Scan Tab)
- Upload receipt screenshots from Indonesian e-money apps
- AI-powered parsing using Google Gemini API
- Auto-detects payment app type: **Gojek, OVO, BCA, Grab** (or manual selection)
- Extracts transaction details: date, amount, merchant, category
- Receipt images stored in MinIO and linked to transactions
- Smart duplicate detection with fuzzy matching on merchant/expense names
- Override false-positive duplicates with "Keep anyway" option
- Auto-skips failed/cancelled transactions
- Manual field editing before confirmation
- Confirmation dialog before removing scanned items

### Ledger / Transaction History (Ledger Tab)
- View all recorded transactions
- Date range filtering (defaults to current month)
- Filter by category and user
- Full editing capabilities:
  - Edit date, category, amount, merchant, payment source, user, remarks
  - Exclude transactions from dashboard calculations
- View original receipt image (lightbox preview)
- Delete transactions with confirmation dialog
- Formatted currency display (IDR)
- Effective total calculation (excluding marked transactions)

### Dashboard (Dash Tab)
- Spending summary by category
- Category breakdown with percentages
- Visual progress bars
- Total spending overview
- Automatically excludes marked transactions from calculations

### Multi-User Support
- Supports multiple users (configurable via backend)
- User selector on scan page
- Default user assignment for scanned items
- Filter transactions by user in ledger

### Categories
- Food
- Transport
- Wifi
- Insurance
- Rent
- Top-up
- Bills
- Others

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/transactions/upload` | Upload & parse receipt image |
| POST | `/transactions/check-duplicates` | Check for duplicate transactions |
| POST | `/transactions/confirm` | Save scanned transactions to database |
| GET | `/transactions/history` | Fetch transactions with date range |
| GET | `/transactions/dashboard` | Get spending summary by category |
| PUT | `/transactions/:id` | Update a transaction |
| DELETE | `/transactions/:id` | Delete a transaction |

---

## Architecture

### Frontend

```
frontend/src/
├── main.tsx                    # Entry point with providers
├── index.css                   # Tailwind imports
├── routeTree.gen.ts            # Auto-generated route tree
│
├── routes/                     # TanStack Router pages
│   ├── __root.tsx              # Root layout (header, nav)
│   ├── index.tsx               # Redirect to /scan
│   ├── scan.tsx                # Upload & parse receipts
│   ├── ledger.tsx              # Transaction history
│   └── dashboard.tsx           # Spending analytics
│
├── components/                 # UI components by feature
│   ├── common/                 # Shared (ConfirmDialog)
│   ├── layout/                 # Header, TabNav
│   ├── scan/                   # FileUpload, TransactionItem, ImagePreview
│   ├── ledger/                 # DateFilter, TransactionCard, EditForm
│   ├── dashboard/              # TotalCard, CategoryChart
│   └── ui/                     # Toast notifications
│
├── context/                    # React Context providers
│   ├── AppContext.tsx          # Config, user state
│   ├── TransactionContext.tsx  # Transaction data
│   └── ToastContext.tsx        # Toast notifications
│
├── hooks/                      # Custom hooks
│   ├── useTransactions.ts      # CRUD operations
│   └── useImagePreview.ts      # Image zoom state
│
├── services/                   # API layer
│   ├── api.ts                  # Axios instance
│   ├── config.ts               # Config endpoint
│   └── transactions.ts         # Transaction endpoints
│
├── types/                      # TypeScript interfaces
│   └── index.ts
│
└── utils/                      # Utility functions
    └── format.ts               # formatIDR, formatDate
```

### Backend

The backend follows clean architecture principles:

```
backend/src/
├── main.ts                           # Application entry point
├── app.module.ts                     # Root module
│
├── common/                           # Shared code
│   ├── config/                       # Configuration
│   ├── dtos/                         # Data Transfer Objects
│   └── enums/                        # Enumerations
│
├── database/                         # Database layer
│   ├── database.module.ts
│   ├── database.provider.ts          # PostgreSQL connection
│   ├── schema.ts                     # Drizzle schema
│   └── migrations/
│
└── modules/
    ├── parser/                       # Receipt parsing (Strategy Pattern)
    │   ├── parser.module.ts
    │   ├── parser.service.ts         # Orchestrator
    │   ├── parser.factory.ts         # Strategy factory
    │   └── strategies/               # Payment app parsers
    │       ├── base.parser.ts
    │       ├── gojek.parser.ts
    │       ├── ovo.parser.ts
    │       ├── bca.parser.ts
    │       ├── grab.parser.ts
    │       └── default.parser.ts
    │
    ├── storage/                      # MinIO storage
    │   ├── storage.module.ts
    │   └── storage.service.ts
    │
    └── transactions/                 # Transaction management
        ├── transactions.module.ts
        ├── transactions.controller.ts
        ├── transactions.service.ts
        └── transactions.repository.ts
```

---

## Adding a New Payment Parser

To add support for a new payment app (e.g., Dana):

1. Create a new parser in `backend/src/modules/parser/strategies/`:

```typescript
// dana.parser.ts
import { BaseParser } from './base.parser';

export class DanaParser extends BaseParser {
  readonly appType = 'Dana';

  canParse(detectedApp: string): boolean {
    return detectedApp.toLowerCase() === 'dana';
  }

  getPrompt(): string {
    return `Extract Dana transaction history from this screenshot...`;
  }
}
```

2. Register in `parser.factory.ts`:

```typescript
this.parsers = [
  new GojekParser(),
  new DanaParser(),  // Add here
  new OVOParser(),
  // ...
];
```

3. Update the app detection prompt in `parser.service.ts` to include "Dana" as an option.

---

## Docker Services

### PostgreSQL
- **Port**: 5432
- **User**: exp_track
- **Password**: exp_track_password
- **Database**: exp_track

### MinIO
- **API Port**: 9000
- **Console Port**: 9001
- **User**: minio_admin
- **Password**: minio_password
- **Bucket**: receipts

Access MinIO console at `http://localhost:9001`

---

## Development

### Database Migrations

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate

# Push schema to database
pnpm drizzle-kit push

# Open Drizzle Studio (database GUI)
pnpm drizzle-kit studio
```

### Stopping Infrastructure

```bash
docker compose down

# To remove volumes (reset data)
docker compose down -v
```

---

## Coding Standards

### General Principles
- **TypeScript**: Strict mode enabled, no `any` types unless absolutely necessary
- **Functional approach**: Prefer pure functions, immutability, and composition
- **Single responsibility**: Each file/function should do one thing well
- **No over-engineering**: Only add complexity when needed, avoid premature abstractions

### Backend (NestJS)
- **Clean Architecture**: Controller → Service → Repository pattern
- **DTOs**: All request/response data validated with `class-validator`
- **Strategy Pattern**: Used for payment app parsers (easy to extend)
- **Database**: Drizzle ORM with explicit schema, migrations tracked in `drizzle/`
- **Naming**: PascalCase for classes, camelCase for functions/variables

### Frontend (React)
- **Component Structure**:
  - `components/` - Reusable UI components grouped by feature
  - `context/` - React Context for global state
  - `hooks/` - Custom hooks for reusable logic
  - `services/` - API calls (axios)
  - `routes/` - TanStack Router page components
  - `types/` - TypeScript interfaces
  - `utils/` - Pure utility functions
- **State Management**: React Context + hooks (no Redux)
- **Styling**: Tailwind CSS, mobile-first design
- **Naming**: PascalCase for components, camelCase for hooks/functions

### Mobile-First UI
- Minimum touch targets: 44x44px
- Large inputs with `min-h-[48px]`
- Use `style={{ fontSize: '16px' }}` on selects to prevent iOS zoom
- Full-width buttons for primary actions

---

## Future Plans

### Short Term
- [ ] Add recurring transactions support
- [ ] Export transactions to CSV/Excel
- [ ] Monthly spending comparison charts
- [ ] Push notifications for budget alerts

### Medium Term
- [ ] Multi-household/tenant support with authentication
- [ ] Configurable categories, users, and payment methods per household
- [ ] Budget setting and tracking per category
- [ ] Receipt OCR improvements for more payment apps

### Long Term
- [ ] Mobile app (React Native or PWA)
- [ ] Bank statement import (CSV/PDF parsing)
- [ ] AI-powered spending insights and recommendations
- [ ] Shared expense splitting and settlement tracking
