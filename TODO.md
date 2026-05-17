# 📋 Project TODOs

> **Note for AI Agents**: This document is the **Immediate Action Plan**. It contains concrete tasks, bug fixes, and refinements that should be prioritized in current or upcoming sessions.

---

## 📊 Bill Management Refinements
- [ ] **Mismatch Resolution**: Improve the "Mismatch detected" UI in Bill cards to offer a "Re-sync" or "Auto-fix" option for installment schedules.
- [ ] **End Date Buffer**: Add a "Buffer" month option when auto-calculating End Dates to account for interest or variable billing cycles.
- [ ] **Quick Reconcile All**: Add a global button at the top of the Bills page to reconcile history for ALL bills at once.

## 🛠️ UI/UX Improvements
- [ ] **Monthly Savings KPI**: Add a card to the Dashboard/Statistics showing (Income - Expense - Bills Paid) for the current month.
- [ ] **Investment Details**: Enable clicking on an investment to see price history chart (similar to Transactions history).
- [ ] **Global Search**: Add a command-palette style search (Ctrl+K) to quickly jump to transactions or bills.
- [ ] (Ongoing) General CSS cleanup for mobile-first responsiveness.

## 🧪 Testing & Reliability
- [ ] **Validation Logic**: Add Zod schemas for Repository inputs to prevent invalid data from reaching Supabase.
- [ ] **Error Boundaries**: Implement React Error Boundaries for major dashboard widgets.
