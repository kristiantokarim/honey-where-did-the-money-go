# Expense Tracker Project

A full-stack expense tracking application with AI-powered receipt parsing.

## Project Structure

```
exp-track/
├── backend/           # NestJS backend API
│   └── src/
│       ├── common/    # Shared DTOs, enums, utilities
│       ├── database/  # Drizzle ORM schema and migrations
│       └── modules/   # Feature modules (transactions, parser, storage)
├── frontend/          # React + Vite frontend
│   └── src/
│       ├── components/
│       ├── context/
│       ├── services/
│       └── types/
└── pnpm-lock.yaml
```

## Type Safety Standards

### Use Enums Over Strings

Always use enums for fields with a known set of valid values. Never use `string` type for category, payment, transaction type, or mode fields.

**Backend enums** (located in `backend/src/common/enums/`):
- `Category` - Transaction categories (Rent, Meals, Transport, etc.)
- `PaymentApp` - Payment applications (Gojek, OVO, BCA, Grab, Dana, Jenius, Jago, Danamon, Unknown)
- `TransactionType` - Transaction types (Expense, Income, TransferOut, TransferIn)
- `LedgerMode` - Ledger calculation modes (ExpensesOnly, NetTotal)
- `SortBy` - Sort options (Date, Total)

**Frontend enums** (located in `frontend/src/types/enums.ts`):
- Mirror all backend enums for type safety across the stack

### Backend DTO Validation

Use `@IsEnum()` decorator for enum fields:

```typescript
import { IsEnum } from 'class-validator';
import { Category } from '../enums/category.enum';

export class CreateTransactionDto {
  @IsEnum(Category)
  category: Category;
}
```

### Nullability Guidelines

- Only mark fields as optional (`?`) if they are truly optional at runtime
- Parser output fields that are always set should be required
- Use default values in DTOs with `@Transform()` decorator when appropriate
- Query filter parameters are legitimately optional
- Prefer `T | null` over `T | undefined` for explicit null semantics

### Frontend Type Alignment

- Keep frontend enums in sync with backend enums
- When backend enum changes, update `frontend/src/types/enums.ts`
- Use strict TypeScript: avoid `as any` or type assertions
- Import enums from `types/enums` for type safety

## Development Commands

### Backend
```bash
cd backend
npm run start:dev    # Development server
npm run build        # TypeScript compilation
npm run lint         # ESLint
```

### Frontend
```bash
cd frontend
npm run dev          # Vite dev server
npm run build        # Production build
npm run lint         # ESLint
```

## Adding New Enums

1. Create enum in `backend/src/common/enums/`
2. Export from `backend/src/common/enums/index.ts`
3. Mirror in `frontend/src/types/enums.ts`
4. Use `@IsEnum()` validator in DTOs