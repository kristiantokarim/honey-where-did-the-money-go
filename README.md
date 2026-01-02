# EXP_PRO - Expense Tracking Application

A full-stack expense tracking application with AI-powered receipt scanning. Built for tracking shared expenses with support for Indonesian e-money payment apps (Gojek, OVO, BCA, Grab).

## Tech Stack

- **Backend**: NestJS, TypeScript, SQLite (better-sqlite3), Drizzle ORM, Google Gemini AI
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Axios

---

## How to Run Backend

### Prerequisites
- Node.js 18+
- pnpm (or npm)
- Google Gemini API key

### Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env` file with your Google API key:
   ```bash
   GOOGLE_API_KEY=your_gemini_api_key_here
   ```

4. Run the server:
   ```bash
   # Development mode (with auto-reload)
   pnpm start:dev

   # Production mode
   pnpm start
   ```

The backend server runs on `http://localhost:3000`

---

## How to Run Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run the development server:
   ```bash
   pnpm dev
   ```

The frontend runs on `http://localhost:5173`

### Production Build

```bash
pnpm build
pnpm preview
```

---

## Features

### Receipt Scanning (Scan Tab)
- Upload receipt screenshots from Indonesian e-money apps
- AI-powered parsing using Google Gemini API
- Auto-detects payment app type: **Gojek, OVO, BCA, Grab**
- Extracts transaction details: date, amount, merchant, category
- Receipt preview with zoom capability
- Duplicate detection before saving
- Manual field editing before confirmation

### Ledger / Transaction History (Ledger Tab)
- View all recorded transactions
- Date range filtering (defaults to current month)
- Full editing capabilities:
  - Edit date, category, amount, merchant, payment source, user, remarks
  - Exclude transactions from dashboard calculations
- Formatted currency display (IDR)
- Effective total calculation (excluding marked transactions)

### Dashboard (Dash Tab)
- Spending summary by category
- Category breakdown with percentages
- Visual progress bars
- Total spending overview
- Automatically excludes marked transactions from calculations

### Multi-User Support
- Supports multiple users (Kris & Iven)
- User selector in header
- Default user assignment for scanned items

### Categories
- Food
- Transport
- Wifi
- Insurance
- Rent
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

---

## Project Structure

```
exp-track/
├── backend/
│   ├── src/
│   │   ├── main.ts           # NestJS entry point
│   │   ├── app.module.ts     # Root module
│   │   ├── app.controller.ts # REST API endpoints
│   │   ├── parser.service.ts # AI receipt parsing logic
│   │   └── db/
│   │       ├── schema.ts     # Drizzle table definitions
│   │       └── db.provider.ts
│   ├── package.json
│   └── drizzle.config.ts
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main React component
│   │   ├── main.tsx          # React entry point
│   │   └── index.css
│   ├── package.json
│   └── vite.config.ts
└── pnpm-workspace.yaml
```
