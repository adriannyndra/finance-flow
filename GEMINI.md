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

### Bill Management (Manual Confirmation)
To ensure user control, bills are NO LONGER automatically converted into transactions.
- **Location**: `features/bills/use-cases/ProcessBills.ts` (Cleanup) & `app/(dashboard)/dashboard/page.tsx` (Trigger).
- **UX**: Unpaid bills for the current month appear on the Dashboard with a **"Confirm Payment"** checkmark.
- **Transaction Creation**: Transactions are only added to the ledger AFTER the user confirms the payment via the dashboard modal.
- **Expiration Logic**: `ProcessBills.ts` automatically deactivates bills that have passed their `endDate`.

## 📝 User Experience

### Universal Date Selection
To maintain a high-fidelity experience, the application uses a custom-built Calendar component instead of the browser's default date picker.
- **Component**: `components/design/DatePicker.tsx`.
- **Implementation**: MUST be used for all date-related inputs (Transactions, Bills, Investments) to ensure consistent styling and mobile usability.
- **Logic**: Handles ISO format (`YYYY-MM-DD`) and includes a "Select Today" quick action.

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

### Polished Modal Experience
To maintain a high-quality app feel, we avoid using default browser components (like `window.prompt` or `window.confirm`) for primary user interactions.
- **Convention**: All interactive inputs (e.g., adding funds, confirming deletions) MUST use custom React modals.
- **Implementation**: See `components/AddFundsModal.tsx` and `components/ConfirmationModal.tsx` for reference.
- **Benefits**: Better styling consistency, support for dark mode, and improved mobile usability.

### Wishlist & Savings Ledger
Wishlist contributions are not just balance updates; they are recorded as transactions to maintain cash flow accuracy.
- **Logic**: 
  - `Add Funds` = **Expense** transaction (Today's date).
  - `Withdrawal` = **Income** transaction (Today's date).
- **Categorization**: All wishlist transactions MUST use the system category `🎯 Wishlist` and include the `wishlistId` in the transaction metadata/record.

### The Budget "Truth" Page
The Budget page is the comprehensive view of monthly spending, regardless of whether a category was planned.
- **Planned vs. Unplanned**: The UI explicitly separates categories with set limits from those without.
- **Drill-down Pattern**: Every category progress card is a gateway to its transaction history. Clicking it MUST open a filtered view of transactions for that category and month.
- **Distribution Analysis**: High-density categorical analysis (Pie charts) should be housed in a modal (e.g., `CategoryBreakdownModal`) to maintain page focus and reduce layout clutter.

## 📊 Analytics

### Bill Type Analytics
The Statistics page provides a high-level breakdown of financial commitments.
- **Grouping**: Bills can be grouped by **Type** (Subscription vs. Installment vs. One-time).
- **Historical Context**: The analysis includes **Archived** bills to ensure historical debt/spending is accurately represented in long-term reports.

### Bill Reconciliation (Auto-Link)
To maintain data integrity between expected bills and actual bank transactions, the system includes a "Scan & Link" feature.
- **Location**: `app/(dashboard)/bills/page.tsx` (`handleReconcile`)
- **Logic**: Scans transaction history for unlinked expenses that match the bill's category or description.
- **UX**: Uses `ConfirmationModal` to batch-create `ff_bill_items` and link them to existing `ff_transactions`.

### Financial Terminology Support
Complex financial views (like Statistics) include standardized informational support.
- **Pattern**: Every major chart header MUST include an `(i)` Info button.
- **Component**: Uses `components/InfoModal.tsx` to provide clear, categorized definitions of terms like "Net Worth", "Liabilities", and "Unplanned Spending".
- **Styling**: Modals use the `zinc` and `rose/emerald/indigo` accent colors for semantic categorization of terms.

### Polished Tooltip Contrast
To ensure 100% visibility across Light and Dark modes, all tooltips follow a high-contrast pattern.
- **Background**: Always solid white (`#fff`) with bold black text (`#18181b`) for labels.
- **Values**: Values use the dynamic color of their series (Green/Red/etc.), with a dark fallback for light colors (like grey) to ensure readability on the white background.
- **Format**: Follows the `Name: Value` single-line format for data points.
