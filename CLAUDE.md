# FinanceFlow - Project Guide

## Project Overview
A Next.js 15+ finance manager utilizing Supabase for authentication and database management. The application tracks transactions, investments (stocks/crypto), and user settings with a focus on Indonesian locale (IDR currency, dot separators).

## Common Commands
- `npm run dev`: Start the development server
- `npm run build`: Build for production
- `npm run lint`: Run ESLint checks

## Core Tech Stack
- **Framework:** Next.js (App Router)
- **Authentication:** Supabase Auth (`@supabase/ssr`)
- **Database:** Supabase (Tables: `ff_transactions`, `ff_investments`)
- **Styling:** Tailwind CSS (Theme: Zinc/Emerald)
- **Icons:** Lucide React

## Development Patterns
### Authentication
- Middleware (`middleware.ts`) must call `updateSession` from `@/utils/supabase/middleware` to maintain sessions.
- Use `getUserId()` from `@/utils/auth/get-user-id` (reads `user_session` cookie) or `supabase.auth.getUser()` for robust ID retrieval.
- Logout must clear the `user_session` cookie and sign out of Supabase.

### Form Handling & UI
- **Numeric Inputs:** Use `formatNumberInput` and `parseNumberInput` helpers for Indonesian-style thousands separators (dots).
- **Currency:** Use `formatIDR` helper for consistent currency display.
- **Dynamic Categories:** Transaction categories are restricted based on type (`expense` vs `income`).

### Component Design
- **Dashboard Table:** Implements sorting (latest/oldest) via table headers and pagination (10, 50, 100 rows).
- **Icons:** Use `lucide-react` for all UI icons.
- **Color Palette:** Primary accent is `emerald-600`, backgrounds use `zinc` shades.

---
*Note: This project uses specific Supabase patterns for SSR. Refer to `utils/supabase/` for client/server/middleware implementations.*
