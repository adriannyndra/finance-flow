# Project Intelligence (Gemini)

This file contains team-shared conventions, specialized workflows, and intelligence about the `finance-manager` codebase established during development.

## 🔒 Security & Privacy

### User-Derived Masking (Project-Wide)
To prevent casual data peeking in the database (Supabase), financial amounts across ALL features (Transactions, Budgets, Bills) are "masked" using a **User-Derived Offset**.
- **Location**: Implementation is centralized in Repository classes (e.g., `SupabaseTransactionRepository.ts`, `SupabaseBillRepository.ts`).
- **Logic**: A numeric salt is calculated from the user's UUID.
  - `Masked Amount = Actual Amount + Salt`
  - `Actual Amount = Masked Amount - Salt`
- **Benefits**:
  - Unique salt per user (User A's 1M looks different from User B's 1M).
  - Preserves **Sorting** compatibility in the database since the salt is constant for a given user.
  - No need for external secret management (`.env`) for the salt logic itself.
- **Mandate**: ANY new feature involving financial amounts MUST implement this masking/unmasking logic in its repository layer.

## 📝 User Experience

### Key Term Suggestion Logic
The transaction description input uses an advanced suggestion algorithm that prioritizes "Key Terms" over exact history.
- **Location**: `app/(dashboard)/transactions/page.tsx` (`descriptionHistory` useMemo)
- **Logic**:
  - Analyzes the first 2 and 3 words of every past transaction.
  - If a prefix appears in multiple different transactions (e.g., "PTPT Hadiah ..."), it is flagged as a **Key Term**.
  - Key Terms are suggested at the top of the list to keep the UI clean and efficient.

## ⚙️ Automation

### Bill Automation (Recurring Transactions)
Active bills are automatically converted into transactions for the **current month** only.
- **Location**: `features/bills/use-cases/ProcessBills.ts`
- **Trigger**: Called on the **Dashboard** page load.
- **Logic**: 
  - Checks if a bill is active and not expired (`endDate`).
  - **Monthly Isolation**: Only checks the current YYYY-MM.
  - **Billing Day Trigger**: Only generates if `today's date >= billing_day`.
  - **Duplicate Prevention**: Updates `lastGeneratedMonth` on the bill to ensure once-per-month creation.
  - **Prefix**: Creates a transaction with `[Recur]` prefix.

## 📊 Analytics

### Key Term Analytics (Bills)
The Statistics page groups bills by "Key Terms" to provide a cleaner breakdown than category-only views.
- **Location**: `app/(dashboard)/statistics/page.tsx` (`billAnalysisData` useMemo)
- **Logic**: Splits the bill name by spaces and takes the **first 2 words** (e.g., "Gopay Pinjam #1" and "Gopay Pinjam #2" both become "Gopay Pinjam").
- **Usage**: A toggle allows switching between this "Key Terms" view and the standard "Category" view.

### Centralized Data Fetching
Even for read-only pages like **Dashboard** and **Statistics**, data MUST be fetched via the relevant Repository (e.g., `SupabaseTransactionRepository`).
- **Reason**: To ensure the **Unmasking** logic is applied consistently across the whole app.
- Direct Supabase calls in `app/` will result in incorrect (masked) values being displayed.
- **Mandate**: ANY new feature involving financial amounts MUST implement this masking/unmasking logic in its repository layer.
