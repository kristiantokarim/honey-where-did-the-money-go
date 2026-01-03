# honey-where-did-the-money-go

A full-stack expense tracking application with AI-powered transaction history scanning. Built for tracking shared household expenses with support for Indonesian e-money payment apps.

---

## Why This Exists (A.K.A. The Pain)

Indonesia is a *wonderfully* cashless country. So cashless, in fact, that we've somehow ended up with approximately 47 different finance apps competing for the privilege of holding our money. In our household alone, we juggle: **Gojek, Grab, OVO, Dana, Jenius, Jago, Danamon, BCA, and Allo Bank**. Yes, nine apps. No, we don't know how it got this bad either.

This makes expense tracking an absolute *joy*. Every month, we'd spend hours playing detective across nine different apps, squinting at transaction histories, and manually typing everything into Excel like it's 2005. We tried automating it with email notifications, but surprise—not every app sends transaction emails. Some do. Some don't. Some send them only on Tuesdays when Mercury is in retrograde.

But you know what ALL of them have? **Transaction history screens.** Beautiful, screenshot-able transaction histories.

So instead of continuing our monthly ritual of manual data entry and existential dread, we built this tool. Modern OCR and LLMs are good enough now that a screenshot of your transaction history can be parsed into structured data in seconds. No more squinting. No more typing. No more "wait, was that Rp 45.000 or Rp 450.000?"

"But why don't you just use ONE app instead of nine?" Oh, sweet summer child. And miss all the discounts? Absolutely not. Each app has its own partnerships and promotions that make it better than the others in specific situations. Gojek is cheaper for rides on Monday, Grab has better food promos on weekends, Allo Bank randomly has 50% off on Tiket.com, BCA credit card gives cashback at certain merchants, OVO has points multipliers... you get the idea. Consolidating into a single payment app means leaving money on the table, and we refuse to do that out of mere *laziness*.

So instead of simplifying our financial life like normal people, we built ANOTHER APP to patch the chaos. "Why not use APIs?" you ask. Adorable. Half these apps don't expose APIs, and the ones that do (looking at you, Open Banking) charge fees that would defeat the purpose of all those discounts we're hoarding.

**TL;DR**: We were too lazy to keep doing manual expense tracking, so we spent way more time building an app to automate it. Peak efficiency.
---

## Demo (Video)



https://github.com/user-attachments/assets/1c95a321-9137-4bf1-9466-eb23602abf1a



---

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

### Transaction History Scanning (Scan Tab)
- Upload transaction history screenshots from Indonesian e-money apps
- AI-powered parsing using Google Gemini API
- Auto-detects payment app type: **Gojek, OVO, BCA, Grab** (or manual selection)
- Extracts transaction details: date, amount, merchant, category
- Screenshots stored in MinIO and linked to transactions
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
- View original screenshot (lightbox preview)
- Delete transactions with confirmation dialog
- Formatted currency display (IDR)
- Effective total calculation (excluding marked transactions)

### Dashboard (Dash Tab)
- Spending summary by category
- Category breakdown with percentages
- Visual progress bars
- Total spending overview
- Automatically excludes marked transactions from calculations
- Click any category to drill down and see individual transactions (sorted by amount)

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

### Core Features
- [ ] Multi-household/tenant support with authentication
- [ ] Configurable categories, users, and payment methods per household

### Input Methods
- [ ] Ability to accept Bank Statement PDF parsing
- [ ] Ability to accept multiple images/files in single upload
- [ ] Ability to accept video recording of scrolling through transaction history
- [ ] Clipboard paste support for screenshots
- [ ] WhatsApp bot integration for quick uploads

### Analytics & Insights
- [ ] Monthly/yearly spending comparison charts
- [ ] Budget setting and alerts per category
- [ ] Spending trends and patterns visualization
- [ ] AI-powered spending insights ("You spent 40% more on Food this month")
- [ ] Export to CSV/Excel/Google Sheets

### Quality of Life
- [ ] Undo/restore deleted transactions
- [ ] Dark mode

