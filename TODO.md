# 📋 Project TODOs

> **Note for AI Agents**: This document is the **Immediate Action Plan**. It contains concrete tasks, bug fixes, and refinements that should be prioritized in current or upcoming sessions.

---

## 🔄 Bills & Automation Refactor
- [x] **Bills Summarization on Dashboard**: Add a "Upcoming Bills" section on the homepage showing total bills due for the next month.
- [x] **Conditional Transaction Generation**: Refactor `ProcessBills` logic. Do not automatically add `[Recur]` transactions to the history unless it's for the current month AND the user has confirmed it (or it's marked as paid).
- [x] **"Mark as Paid" Feature**:
    - Add a "Confirm Payment" or "Mark as Paid" button to each bill card in the `/bills` page.
    - This should trigger the creation of a transaction and update the `last_generated_month`.

## 🛠️ UI/UX Improvements
- [ ] **Key Terms Suggestion for Bills**: Implement "Key Term" suggestion logic for bill names (similar to Transactions) to avoid repetitive typing.
- [ ] (Ongoing) General cleanup and refinement based on user feedback.
