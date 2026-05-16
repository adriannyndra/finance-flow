# Project Intelligence (Gemini)

This file contains team-shared conventions, specialized workflows, and intelligence about the `finance-manager` codebase established during development.

## 🔒 Security & Privacy

### User-Derived Masking
To prevent casual data peeking in the database (Supabase), financial amounts are "masked" using a **User-Derived Offset**.
- **Location**: `features/transactions/infrastructure/SupabaseTransactionRepository.ts`
- **Logic**: A numeric salt is calculated from the user's UUID.
  - `Masked Amount = Actual Amount + Salt`
  - `Actual Amount = Masked Amount - Salt`
- **Benefits**:
  - Unique salt per user (User A's 1M looks different from User B's 1M).
  - Preserves **Sorting** compatibility in the database since the salt is constant for a given user.
  - No need for external secret management (`.env`) for the salt logic itself.

## 📝 User Experience

### Key Term Suggestion Logic
The transaction description input uses an advanced suggestion algorithm that prioritizes "Key Terms" over exact history.
- **Location**: `app/(dashboard)/transactions/page.tsx` (`descriptionHistory` useMemo)
- **Logic**:
  - Analyzes the first 2 and 3 words of every past transaction.
  - If a prefix appears in multiple different transactions (e.g., "PTPT Hadiah ..."), it is flagged as a **Key Term**.
  - Key Terms are suggested at the top of the list to keep the UI clean and efficient.

## 📊 Analytics

### Centralized Data Fetching
Even for read-only pages like **Dashboard** and **Statistics**, data MUST be fetched via the `SupabaseTransactionRepository`.
- **Reason**: To ensure the **Unmasking** logic is applied consistently across the whole app.
- Direct Supabase calls in `app/` will result in incorrect (masked) values being displayed.
