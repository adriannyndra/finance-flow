# 📋 Project TODOs

> **Note for AI Agents**: This document is the **Immediate Action Plan**. It contains concrete tasks, bug fixes, and refinements that should be prioritized in current or upcoming sessions.

---

## 📊 Bill Visualization & Tracking
- [x] **Database Migration**: Add `total_amount` column to `ff_bills` table.
- [ ] **Frontend Calculation**: Implement logic to calculate/auto-fill `total_amount` based on `monthly_amount`, `end_date`, and `billing_day`.
- [ ] **Progress Visualization**: Add progress bar to Bill cards displaying completion percentage based on payments made vs. total amount.
- [ ] **Bill Details Modal/Page**: Enable clicking on a bill card to view historical payment details.
- [ ] **Date Handling**: Implement automatic 1-month `end_date` default for new bills with options to clear or customize.

## 🛠️ UI/UX Improvements
- [x] **Key Terms Suggestion for Bills**: Implement "Key Term" suggestion logic for bill names (similar to Transactions) to avoid repetitive typing.
- [ ] (Ongoing) General cleanup and refinement based on user feedback.
