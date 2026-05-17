# 📋 Project TODOs

> **Note for AI Agents**: This document is the **Immediate Action Plan**. It contains concrete tasks, bug fixes, and refinements that should be prioritized in current or upcoming sessions.

---

## 📊 Bill Visualization & Tracking
- [x] **Database Migration**: Add `total_amount` column and `bill_type` to `ff_bills`; create `ff_bill_items` table.
- [x] **Frontend Calculation**: Implement tenure-based split logic and bidirectional total debt synchronization.
- [x] **Progress Visualization**: Add progress bar to Bill cards displaying completion percentage based on payments made vs. total amount.
- [x] **Bill Details Modal/Page**: Implement "Roadmap" modal to view and manage individual payment items.
- [x] **Date Handling**: Handle specific deadline dates for one-time bills and tenure schedules.
- [x] **Manual Items**: Allow adding/editing/deleting individual bill items within a debt schedule.

## 🛠️ UI/UX Improvements
- [x] **Professional Icons**: Replaced emojis with Lucide icons in sidebar and mobile navigation.
- [x] **Minimalist Mobile Nav**: Removed text labels from bottom navigation for cleaner mobile view.
- [x] **Key Terms Suggestion for Bills**: Implement "Key Term" suggestion logic for bill names (similar to Transactions) to avoid repetitive typing.
- [x] **Categorized View**: Sorted bills into Subscriptions, Installments, and One-time sections.
- [ ] (Ongoing) General cleanup and refinement based on user feedback.
