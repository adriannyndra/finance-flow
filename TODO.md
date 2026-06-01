# 📋 Project TODOs

> **Note for AI Agents**: This document is the **Immediate Action Plan**. It contains concrete tasks, bug fixes, and refinements that should be prioritized in current or upcoming sessions.

---

## 📊 Statistics Refinements (Current Focus)
- [ ] **Fix Tooltip Double-Rendering**: Resolve issue where Statistics tooltips display double labels (e.g., "Expense: Expense: Rp ...") due to custom formatter logic.
- [ ] **Budget Heatmap**: Identify categories that are consistently over-budget over the last 6 months.

## 📊 Bill Management Refinements
- [ ] **End Date Buffer**: Add a "Buffer" month option when auto-calculating End Dates to account for interest or variable billing cycles.

## 🧪 Testing & Reliability
- [ ] **Validation Logic**: Add Zod schemas for Repository inputs to prevent invalid data from reaching Supabase.
- [ ] **Error Boundaries**: Implement React Error Boundaries for major dashboard widgets.

## 🏗️ Architecture & Domain Model
- [ ] **Rich Domain Entities**: Refactor anemic entities (Transaction, Budget, Bill) to include business logic, self-validation, and domain rules (e.g., masking logic, status transitions) to move away from being simple data holders.
