# FinanceFlow - Project Guide

> **Project Navigation**: Return to [README.md](./README.md) for full project documentation and resources.

## Project Overview
A Next.js 15+ finance manager utilizing Supabase for authentication and database management. The application tracks transactions, investments (stocks/crypto), and user settings with a focus on Indonesian locale (IDR currency, dot separators).

## Common Commands
- `npm run dev`: Start the development server
- `npm run build`: Build for production
- `npm run lint`: Run ESLint checks

## Core Tech Stack
- **Framework:** Next.js (App Router)
- **Authentication:** Supabase Auth (`@supabase/ssr`)
- **Database:** Supabase (Tables: `ff_transactions`, `ff_investments`, `ff_budgets`, `ff_bills`)
- **Naming Conventions:** Use `snake_case` for database columns (e.g., `billing_day`, `end_date`, `user_id`) and `camelCase` for TypeScript entity properties (mapped in Repository layer).
- **Styling:** Tailwind CSS (Theme: Zinc/Emerald)
- **Icons:** Lucide React

## Development Patterns
### Security & Data Integrity
- **User-Derived Masking**: All financial amounts are stored in Supabase with a user-specific offset.
  - **Logic**: `Masked = Actual + Salt` (where salt is derived from user UUID).
  - **Mandate**: Implementation MUST reside in the Repository layer (`infrastructure/`) for all features.
- **Centralized Fetching**: Always use Repository classes to fetch data to ensure unmasking is applied consistently. Direct Supabase calls in `app/` will result in incorrect (masked) values.

### Automation
- **Bill Processing**: Active bills are automatically generated on Dashboard load via `ProcessBills` use case.
  - **Trigger**: `today's date >= billing_day`.
  - **Logic**: Checks `lastGeneratedMonth` to prevent duplicates.
  - **Naming**: Transactions are created with `[Recur]` prefix.

### Analytics
- **Key Term Analytics**: The Statistics page allows grouping bills by "Key Terms" (first 2 words of name).
- **Key Term Suggestions**: Transaction description inputs prioritize "Key Terms" (prefixes common to multiple entries) for suggestions.

### Authentication
- Middleware (`middleware.ts`) must call `updateSession` from `@/utils/supabase/middleware` to maintain sessions.
- Use `getUserId()` from `@/utils/auth/get-user-id` (reads `user_session` cookie) or `supabase.auth.getUser()` for robust ID retrieval.
- Logout must clear the `user_session` cookie and sign out of Supabase.

### External APIs
- **Stock/Crypto Data**: Fetched via a proxy route (`/api/stock/history`) which queries Yahoo Finance. Crypto symbols (BTC, ETH, etc.) are automatically mapped to `-USD` pairs.

### Form Handling & UI
- **Numeric Inputs**: Use `formatNumberInput` and `parseNumberInput` helpers for Indonesian-style thousands separators (dots).
- **Currency**: Use `formatIDR` helper for consistent currency display.
- **Dynamic Categories**: Transaction categories are restricted based on type (`expense` vs `income`).

### Component Design
- **Dashboard Table**: Implements sorting (latest/oldest) via table headers and pagination (10, 50, 100 rows).
- **Icons**: Use `lucide-react` for all UI icons.
- **Color Palette**: Primary accent is `emerald-600`, backgrounds use `zinc` shades.

---
*Note: This project uses specific Supabase patterns for SSR. Refer to `utils/supabase/` for client/server/middleware implementations.*

