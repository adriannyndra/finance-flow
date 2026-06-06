# 📋 Project TODOs

> **Note for AI Agents**: This document is the **Immediate Action Plan**. It contains concrete tasks, bug fixes, and refinements that should be prioritized in current or upcoming sessions.

---

## ✅ Completed (Recent)
- [x] **Bill Processing**: Refactored to manual "Confirm Payment" workflow.
- [x] **Dashboard UI**: Interactive Pie Charts, Budget Summary Empty States, and Layout Balance fixed.
- [x] **Universal Date Picker**: Implemented high-fidelity calendar component for all date inputs.
- [x] **Statistics Enhancements**: 1 Month filter and "This Month at a Glance" header.

## 🐞 Urgent Fixes & Refinements
- [ ] **Data Integrity**: Implement soft-deletion for Bills to ensure historical transactions linked to those bills remain valid and reachable in reports.
- [ ] **UI Polish**: Add subtle hover animations and micro-interactions to Dashboard summary cards.

## 📊 Statistics Refinements (Current Focus)
- [ ] **Fix Tooltip Double-Rendering**: Resolve issue where Statistics tooltips display double labels (e.g., "Expense: Expense: Rp ...") due to custom formatter logic.
- [ ] **Budget Heatmap**: Identify categories that are consistently over-budget over the last 6 months.

## 🧪 Testing & Reliability
- [ ] **Validation Logic**: Add Zod schemas for Repository inputs to prevent invalid data from reaching Supabase.
- [ ] **Error Boundaries**: Implement React Error Boundaries for major dashboard widgets.

## 🏗️ Architecture & Domain Model
- [ ] **Rich Domain Entities**: Refactor anemic entities (Transaction, Budget, Bill) to include business logic, self-validation, and domain rules (e.g., masking logic, status transitions) to move away from being simple data holders.
- [ ] **Repository Refactor**: Unify error handling across all Supabase repositories to use a standard Result/Error wrapper.
