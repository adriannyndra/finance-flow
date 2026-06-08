# 📋 Project TODOs

> **Note for AI Agents**: This document is the **Immediate Action Plan**. It contains concrete tasks, bug fixes, and refinements that should be prioritized in current or upcoming sessions.

---

## 🚀 Active Rehaul: Statistics & Layout
- [x] **Phase 1: Statistics Hero Overview**
  - Implement 4 High-Signal Hero Cards (Net Worth, Monthly Surplus, Savings Rate, Total Debt).
  - Redesign Net Worth Area Chart as the central "Core Momentum" visualization.
  - Implement the "Intelligence Hub" Tab Switcher.
- [x] **Phase 2: Bills Intelligence Hub**
  - Card 1: **Future Obligation Projector** (Monthly burn-down chart for next 12 months).
  - Card 2: **Maturity Timeline** (List of end-dates for installments/subscriptions).
  - Card 3: **Fixed Cost Ratio** (Percentage of income consumed by bills).
  - Card 4: **Subscription Fatigue** (Active vs. Archived count).
  - Card 5: **30-Day Bill Heatmap** (Calendar strip of upcoming due dates).
  - Card 6: **Bill Composition** (Relocated existing Category/Term bar chart).
- [x] **Phase 3: Category Detail Migration**
  - Migrate Spending, Assets, and Budgets cards into the new Tabbed Hub (using existing card logic).

## 🐞 Urgent Fixes & Refinements
- [ ] **Projector Double-Count**: Fix bug where one-time bills show up twice in the same month in the Obligation Projector.
- [ ] **Financial Month Shift**: Implement logic to treat bills due on Day 1 (or Day 1-3) as obligations of the *previous* month to align with real-world cash flow.
- [x] **Data Integrity (Ghost Items)**: Overhauled Stats logic to prioritize `billItems` over headers. Manually deleted items now correctly sync.
- [x] **Projector Logic**: Fixed timezone bug (August/July shift) and added strict `endDate` checking.
- [x] **Projector UX**: Updated modal to show "Due [Month] [Day]" for clarity.
- [x] **Heatmap Polish**: Implemented custom floating Intelligence Tooltip.
- [x] **Bill Reconciliation (Strict Sync)**: Updated `handleReconcile` to exact, case-sensitive string matching.

## 🏗️ Intelligence Hub Expansion (6-Card Architecture)
- [ ] **Spending IQ Refinement**:
  - Add **Top Merchants** card.
  - Add **Daily Velocity** card (Avg spend/day).
  - Add **Lifestyle Ratio** (Needs vs. Wants).
- [ ] **Asset Allocation Refinement**:
  - Add **Risk Profile** gauge.
  - Add **Growth Bridge** waterfall chart.
  - Add **Sector Distribution**.
- [ ] **Budget Efficiency Refinement**:
  - Add **Burn Rate** velocity tracker.
  - Add **Unplanned Spending** (Non-budgeted categories).
  - Add **Budget Buster** (Top over-limit category).

## 🏗️ Architecture & Domain Model
- [ ] **Rich Domain Entities**: Refactor anemic entities to include business logic and self-validation.
- [ ] **Repository Refactor**: Unify error handling across all Supabase repositories.

---

## ✅ Completed (Recent Archives)
- [x] **Collapsible Sidebar**: Global layout rehaul for increased "spacey" feel.
- [x] **Bill Logic Fix**: Corrected installment month calculations and "Solve for End Date" logic.
- [x] **Smart Triangle Logic**: Added Tenure-based solving for installments.
- [x] **Transaction UI**: Replaced all native select elements with high-fidelity custom Dropdowns.
- [x] **Universal Date Picker**: Implemented for all date inputs.
- [x] **Bill Processing**: Refactored to manual "Confirm Payment" workflow.
