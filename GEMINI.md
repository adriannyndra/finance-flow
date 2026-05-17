# Project Intelligence (Gemini)

This file contains team-shared conventions, specialized workflows, and intelligence about the `finance-manager` codebase established during development.

## 🔒 Security & Privacy

### User-Derived Masking (Project-Wide)
To prevent casual data peeking in the database (Supabase), financial amounts across ALL features (Transactions, Budgets, Bills) are "masked" using a **User-Derived Offset**.
- **Location**: Implementation is centralized in Repository classes (e.g., `SupabaseTransactionRepository.ts`, `SupabaseBillRepository.ts`).
- **Logic**: A numeric salt is calculated from the user's UUID.
  - `Masked Amount = Actual Amount + Salt`
  - `Actual Amount = Masked Amount - Salt`
- **Mandate**: ANY new feature involving financial amounts MUST implement this masking/unmasking logic in its repository layer.

## ⚙️ Automation

### Bill Automation (Recurring Transactions)
Active bills are automatically converted into transactions for the **current month** only.
- **Location**: `features/bills/use-cases/ProcessBills.ts`
- **Trigger**: Called on the **Dashboard** page load.
- **Logic**: 
  - **Type Filtering**: ONLY processes bills where `billType === 'recurring'`.
  - **Billing Day Trigger**: Only generates if `today's date >= billing_day`.
  - **Duplicate Prevention**: Updates `lastGeneratedMonth` on the bill to ensure once-per-month creation.

### Bill Archiving System
The system automatically manages the lifecycle of a bill to keep the active list clean.
- **Auto-Archive**: Bills are considered "Completed" when `totalPaid >= totalAmount`.
- **UI Separation**: Completed bills are filtered out of the main sections and moved to a "History" view.
- **Muted Styling**: Archived bills use grayscale/muted styles with line-through names to indicate they are no longer active obligations.

## 📝 User Experience

### Smart Triangle Logic (Bills Form)
The Bill Add/Edit form uses manual "Refresh" buttons to solve for missing financial data.
- **Logic**: Treats Amount, Total Goal, and End Date as interdependent.
- **Manual Control**: Users click a refresh icon next to a field to calculate it based on the other two.
- **Units**: Progress for subscriptions is tracked in **Months** (`X / Y Mo`), while installments track **Currency**.

### Next-Month Pre-payment
Users can clear their future obligations ahead of time when they receive their paycheck.
- **Shift Logic**: Once the current month is paid, the primary action button dynamically shifts to **"Pay for [Next Month]"**.
- **Tagged Transactions**: Pre-paid transactions are explicitly tagged with the target period, e.g., `[Paid] Netflix (2026-06)`.

### Navigation UI (Mobile-First)
The bottom navigation bar has been simplified for a cleaner appearance.
- **Change**: Text labels under icons have been removed.
- **Interaction**: Icons use the `title` attribute for accessibility and hover hints.

## 📊 Analytics

### Bill Type Analytics
The Statistics page provides a high-level breakdown of financial commitments.
- **Grouping**: Bills can be grouped by **Type** (Subscription vs. Installment vs. One-time).
- **Historical Context**: The analysis includes **Archived** bills to ensure historical debt/spending is accurately represented in long-term reports.

### Centralized Data Fetching
Even for read-only pages like **Dashboard** and **Statistics**, data MUST be fetched via the relevant Repository (e.g., `SupabaseTransactionRepository`).
- **Reason**: To ensure the **Unmasking** logic is applied consistently across the whole app.
- **Mandate**: ANY new feature involving financial amounts MUST implement this masking/unmasking logic in its repository layer.
