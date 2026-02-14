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
- Multi-page batch uploads with session management
- AI-powered parsing using Google Gemini API
- Background queue processing (3 concurrent)
- Automatic retry with backoff for failed parsing
- Stale processing recovery (stuck jobs >60s are auto-recovered)
- 48-hour session expiration with automatic cleanup
- Auto-detects payment app type: **Gojek, OVO, BCA, Grab, Dana, Jenius, Jago, Danamon** (or manual selection)
- Extracts transaction details: date, amount, merchant, category
- **Transaction type detection**: AI classifies as expense, income, transfer_out, or transfer_in
- Screenshots stored in MinIO and linked to transactions
- Smart duplicate detection with fuzzy matching on merchant/expense names
- Override false-positive duplicates with "Keep anyway" option
- **Transfer matching**: Auto-detects when a transfer matches an existing transaction (e.g., "Transfer to Dana" matches "Received from Gojek")
  - Expandable preview showing matched transaction details and screenshot
  - "Keep Separate" option for false positives
  - Auto-links matched transfers on confirm
- Auto-skips failed/cancelled transactions
- Manual field editing before confirmation
- Confirmation dialog before removing scanned items

### Ledger / Transaction History (Ledger Tab)
- View all recorded transactions
- Date range filtering (defaults to current month)
- Filter by category and user
- **Transaction type badges**: Visual indicators for income, transfer_out, transfer_in
- **Linked transfers**: "Matched" badge with expandable view showing linked transaction details and screenshot
- **Unlink transfers**: Correct false-positive matches after save
- Full editing capabilities:
  - Edit date, category, amount, merchant, payment source, user, remarks
  - Exclude transactions from dashboard calculations
- View original screenshot (lightbox preview)
- Delete transactions with confirmation dialog
- Formatted currency display (IDR)
- **Total modes**: Toggle between "Expenses Only" and "Net Total" (expenses - income)

### Dashboard (Dash Tab)
- Spending summary by category
- Category breakdown with percentages
- Visual progress bars
- Total spending overview
- Automatically excludes marked transactions from calculations
- Click any category to drill down and see individual transactions (sorted by amount)

### Household System
- **Roles**: Owner (invite members, remove members, full control) vs Member (view, contribute)
- **Data scoping**: All transactions and scans scoped to active household via `X-Household-Id` header
- **Multiple households**: Users can belong to multiple households and switch between them
- **Invite flow**: Owner sends invite by email with 7-day token expiration
- **Invitation visibility**: Owners see pending sent invitations; recipients see incoming invitations with accept/decline in Settings
- **When a member leaves**: Transactions stay with the household
- User selector on scan page for assigning transactions
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

## Scan Session API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/scan/sessions` | Create session with uploaded images |
| GET | `/scan/sessions/active?user=` | Get user's active session |
| GET | `/scan/sessions/:id` | Get session status |
| GET | `/scan/sessions/:id/pages/:index` | Get page for review |
| POST | `/scan/sessions/:id/pages/:index/confirm` | Confirm page transactions |
| POST | `/scan/sessions/:id/retry-parse` | Retry failed/stuck parsing |
| DELETE | `/scan/sessions/:id` | Cancel and cleanup session |

## Transaction API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transactions/history` | Fetch transactions with filters |
| GET | `/transactions/dashboard` | Get spending summary by category |
| PUT | `/transactions/:id` | Update a transaction |
| DELETE | `/transactions/:id` | Delete a transaction |
| DELETE | `/transactions/:id/link` | Unlink matched transfer pair |

## Household API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/households` | List user's households |
| POST | `/households` | Create household |
| GET | `/households/my-invitations` | List received invitations |
| DELETE | `/households/my-invitations/:invitationId` | Decline invitation |
| POST | `/households/accept-invitation` | Accept invitation |
| GET | `/households/:id/members` | List members (members only) |
| GET | `/households/:id/invitations` | List sent invitations (owner only) |
| DELETE | `/households/:id/invitations/:invitationId` | Cancel invitation (owner only) |
| POST | `/households/:id/invite` | Invite by email (owner only) |
| DELETE | `/households/:id/members/:userId` | Remove member (owner only) |
| POST | `/households/:id/leave` | Leave household |

## Auth API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout (invalidate refresh token) |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/verify-email` | Verify email with token |
| POST | `/auth/resend-verification` | Resend verification email |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |
| GET | `/auth/me` | Get current user |

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
│   ├── dashboard.tsx           # Spending analytics
│   ├── settings.tsx            # Account & household management
│   ├── login.tsx               # Login page
│   ├── register.tsx            # Registration page
│   ├── forgot-password.tsx     # Password reset request
│   ├── reset-password.tsx      # Password reset form
│   ├── verify-email.tsx        # Email verification
│   └── accept-invitation.tsx   # Household invite acceptance
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
│   ├── AuthContext.tsx         # Authentication state
│   ├── HouseholdContext.tsx    # Household & member state
│   ├── ScanSessionContext.tsx  # Scan session state
│   ├── TransactionContext.tsx  # Transaction data
│   └── ToastContext.tsx        # Toast notifications
│
├── hooks/                      # Custom hooks
│   ├── useTransactions.ts      # CRUD operations
│   └── useImagePreview.ts      # Image zoom state
│
├── services/                   # API layer
│   ├── api.ts                  # Axios instance
│   ├── auth.ts                 # Auth endpoints
│   ├── config.ts               # Config endpoint
│   ├── household.ts            # Household endpoints
│   ├── scanSession.ts          # Scan session endpoints
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
    ├── auth/                         # Authentication & email
    │   ├── auth.module.ts
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── email.service.ts
    │   ├── guards/                   # JWT auth guards
    │   └── decorators.ts             # @CurrentUser, @SkipHousehold
    │
    ├── household/                    # Household management
    │   ├── household.module.ts
    │   ├── household.controller.ts
    │   ├── household.service.ts
    │   └── household.repository.ts
    │
    ├── parser/                       # Receipt parsing (Strategy Pattern)
    │   ├── parser.module.ts
    │   ├── parser.service.ts         # Orchestrator
    │   ├── parser.factory.ts         # Strategy factory
    │   └── strategies/               # Payment app parsers
    │       ├── base.parser.ts        # Abstract base with type detection
    │       ├── gojek.parser.ts
    │       ├── ovo.parser.ts
    │       ├── bca.parser.ts
    │       ├── grab.parser.ts
    │       ├── dana.parser.ts
    │       ├── jenius.parser.ts
    │       ├── jago.parser.ts
    │       ├── danamon.parser.ts
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

To add support for a new payment app (e.g., Allo Bank):

1. Create a new parser in `backend/src/modules/parser/strategies/`:

```typescript
// allo.parser.ts
import { BaseParser } from './base.parser';

export class AlloParser extends BaseParser {
  readonly appType = 'Allo';

  canParse(detectedApp: string): boolean {
    return detectedApp.toLowerCase() === 'allo';
  }

  getPrompt(): string {
    return `Extract Allo Bank transaction history from this screenshot...`;
  }
}
```

2. Register in `parser.factory.ts`:

```typescript
this.parsers = [
  new GojekParser(),
  new AlloParser(),  // Add here
  new OVOParser(),
  // ...
];
```

3. Update the app detection prompt in `parser.service.ts` to include "Allo" as an option.

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
- [ ] Configurable categories and payment methods per household

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

### Upload Experience
- [ ] Cancel upload in progress
- [ ] Persist upload across page refresh (backend job queue)
- [ ] Multiple file upload queue

