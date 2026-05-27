# Database Schema Documentation

This document provides a comprehensive overview of the Supabase tables, columns, and security patterns used in the `finance-manager` project. This is intended for developers who wish to connect to the database from other projects.

## 🛡️ Data Security: User-Derived Masking

**IMPORTANT**: All financial amounts in this database are stored using **User-Derived Masking**. 

- **The Logic**: A numeric "salt" (offset) is calculated based on the user's UUID.
- **Formula**: `Stored Amount = Actual Amount + Offset`
- **Retrieval**: You MUST calculate the same offset using the user's UUID to unmask the data:
  ```typescript
  const offset = userId.split('-').reduce((acc, part) => acc + parseInt(part.substring(0, 4), 16), 0) % 10000 * 100;
  const actualAmount = storedAmount - offset;
  ```
- **Mandate**: Any external project connecting to this database MUST implement this logic to read or write correct financial values.

---

## 📊 Tables Overview

### 1. `ff_transactions`
Primary table for all cash flow (Income, Expense, Wishlist transfers).

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique transaction identifier. |
| `user_id` | UUID (FK) | Reference to `auth.users.id`. |
| `amount` | NUMERIC | **Masked** financial amount. |
| `type` | TEXT | `'income'` or `'expense'`. |
| `category` | TEXT | Spending category (e.g., `'Food'`, `'Transport'`). |
| `description` | TEXT | User-provided memo. |
| `date` | TEXT | ISO Date string (`YYYY-MM-DD`). |
| `wishlist_id` | UUID (FK) | Optional reference to `ff_wishlist`. |

### 2. `ff_budgets`
Monthly spending limits per category.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique budget identifier. |
| `user_id` | UUID (FK) | Reference to `auth.users.id`. |
| `category` | TEXT | The category being budgeted. |
| `amount` | NUMERIC | **Masked** monthly limit. |
| `month` | TEXT | Target month in `YYYY-MM` format. |

### 3. `ff_bills`
Definitions for recurring or installment-based financial obligations.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique bill identifier. |
| `user_id` | UUID (FK) | Reference to `auth.users.id`. |
| `name` | TEXT | Name of the bill/service. |
| `amount` | NUMERIC | **Masked** per-payment amount. |
| `total_amount` | NUMERIC | **Masked** total debt (for installments). |
| `category` | TEXT | Spending category. |
| `frequency` | TEXT | `'monthly'`, `'yearly'`, etc. |
| `billing_day` | INTEGER | Day of the month (1-31). |
| `bill_type` | TEXT | `'recurring'`, `'installment'`, or `'one-time'`. |
| `active` | BOOLEAN | Whether the bill is currently active. |
| `end_date` | TEXT | Optional ISO date when the bill expires. |
| `last_generated_month` | TEXT | The last `YYYY-MM` a transaction was auto-created. |

### 4. `ff_bill_items`
Specific payment records (instances) of a bill.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique item identifier. |
| `user_id` | UUID (FK) | Reference to `auth.users.id`. |
| `bill_id` | UUID (FK) | Reference to `ff_bills.id`. |
| `amount` | NUMERIC | **Masked** payment amount. |
| `due_date` | TEXT | Expected payment date. |
| `paid_at` | TEXT | Actual payment date (ISO). |
| `status` | TEXT | `'pending'` or `'paid'`. |
| `transaction_id` | UUID (FK) | Reference to `ff_transactions.id`. |

### 5. `ff_wishlist`
Savings goals and items the user wants to purchase.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique wishlist identifier. |
| `user_id` | UUID (FK) | Reference to `auth.users.id`. |
| `name` | TEXT | Name of the item/goal. |
| `target_amount` | NUMERIC | **Masked** goal amount. |
| `current_amount` | NUMERIC | **Masked** saved amount. |
| `category` | TEXT | Item category. |
| `priority` | INTEGER | User-defined priority (1-5). |
| `url` | TEXT | Optional link to the product. |
| `is_purchased` | BOOLEAN | Whether the goal has been met. |
| `created_at` | TIMESTAMPTZ | Creation timestamp. |

### 6. `ff_investments`
Market-linked assets like stocks and crypto.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique investment identifier. |
| `user_id` | UUID (FK) | Reference to `auth.users.id`. |
| `name` | TEXT | Asset name (e.g., `'Bitcoin'`, `'Apple'`). |
| `symbol` | TEXT | Ticker symbol (e.g., `'BTC'`, `'AAPL'`). |
| `type` | TEXT | `'stock'`, `'crypto'`, etc. |
| `quantity` | NUMERIC | Number of units held. |
| `buy_price` | NUMERIC | **Masked** average purchase price. |
| `current_price` | NUMERIC | **Masked** last known market price. |
| `date` | TEXT | Purchase date. |

---

## 🔗 Relationships
- **Bill -> Transaction**: `ff_bill_items.transaction_id` links a specific bill payment to its record in `ff_transactions`.
- **Wishlist -> Transaction**: `ff_transactions.wishlist_id` tracks all funds moved into or out of a specific wishlist goal.
