# Clean Architecture Guidelines

This project follows a **Clean Architecture** approach using **Vertical Slices**. This structure decouples business logic from the presentation and infrastructure layers, ensuring high maintainability and scalability.

## Directory Structure

### 1. `core/` (Shared Domain Layer)
Contains globally shared business rules, entities, and utilities that do not depend on any specific framework or feature.
- `entities/`: App-wide types and interfaces (e.g., `Transaction`, `Investment`).
- `formatters/`: Pure functions for data transformation (e.g., Currency formatting).

### 2. `features/` (Application & Infrastructure Layer)
The actual business logic, isolated into vertical slices by feature (e.g., `transactions/`, `investments/`).
Inside each feature:
- `domain/`: Feature-specific types, constants, and interfaces.
- `use-cases/`: Core business logic and workflows (e.g., `GetUserTransactions.ts`). These should be classes or functions that handle a single operation.
- `infrastructure/`: Specific implementations for data fetching (e.g., `SupabaseTransactionRepository.ts`).

### 3. `app/` (Presentation & Delivery Layer)
Strictly for routing, UI rendering, and user interaction.
- Components call **Use Cases**, never infrastructure (like Supabase) directly.
- Uses `core/formatters` for UI display logic.

### 4. `utils/` (Global Infrastructure)
Houses global, third-party integrations and configurations (e.g., Supabase client setup).

---

## How to Implement a New Feature (e.g., "Goals")

1.  **Define Entities**: If the feature has shared types, add them to `core/entities/index.ts`.
2.  **Create Feature Slice**: Create `features/goals/` with `domain/`, `use-cases/`, and `infrastructure/` subfolders.
3.  **Implement Infrastructure**: Create a repository (e.g., `SupabaseGoalRepository.ts`) that handles raw data fetching.
4.  **Implement Use Cases**: Create classes like `CreateGoal.ts` or `GetActiveGoals.ts` that use the repository.
5.  **Connect Presentation**: In your Next.js page (`app/goals/page.tsx`), initialize the repository/use-cases and call them in `useEffect` or event handlers.

## Rules for Agents (LLMs)
- **NEVER** import from `supabase` directly in the `app/` directory (Presentation Layer).
- **NEVER** put business logic (calculations, complex filters) inside a React component. Move it to a **Use Case**.
- **ALWAYS** use the repository pattern in the `infrastructure/` layer of a feature to handle external data.
- **ALWAYS** check `core/formatters` before writing a new formatting utility.
