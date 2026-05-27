# 🚀 Future Feature Ideas & Roadmap

> **Note for AI Agents**: This document is a **Long-Term Roadmap**. It contains speculative, high-impact features that require research or significant design. These are NOT immediate tasks. For the immediate action plan, see `TODO.md`.

---

## 1. 🏦 Automated Wallet & Bank Sync (Open Finance)
**Goal**: Eliminate manual entry by connecting directly to Indonesian financial institutions.

### 🛠 Technical Approach
Use an **Open Finance Aggregator** to handle the complex "SNAP" (Standar Nasional Open API Pembayaran) protocols and security.
- **Potential Partners**: 
  - **Brick (onebrick.io)**: Best for GoPay, ShopeePay, and BCA.
  - **Ayoconnect**: Strongest bank coverage in Indonesia.
- **Workflow**:
  1. User clicks "Connect Bank".
  2. A secure hosted widget opens (provided by the aggregator).
  3. User authenticates via their bank's official portal.
  4. Aggregator provides a `webhook` or `REST API` response with transaction JSON.
- **Key Challenges**:
  - Monthly subscription fees for API access.
  - Maintaining user consent tokens (usually expire every 90 days).

---

## 2. 📄 Receipt OCR & Auto-Categorization
**Goal**: Allow users to take a photo of a physical receipt and have the transaction added automatically.

### 🛠 Technical Approach
1. **Storage**: Upload images to `Supabase Storage`.
2. **Processing**: Use **Tesseract.js** (client-side) or **Google Vision API / AWS Textract** (server-side).
3. **Parsing Logic**:
   - Use Regex or LLM (Gemini API) to extract:
     - Total Amount
     - Merchant Name
     - Date
     - Individual items for "Split Transaction" support.
- **Key Challenges**:
  - Blurry photos or crumpled receipts.
  - Handling different receipt formats (Indomaret vs. Starbucks vs. handwritten).

---

## 3. 📥 Universal CSV/Excel Importer
**Goal**: Batch-import transactions from "Mutasi Rekening" downloads.

### 🛠 Technical Approach
- Create a mapping system for common Indonesian banks:
  - **BCA**: `.csv` export from KlikBCA.
  - **Mandiri**: `.pdf` or `.csv` from Livin'.
  - **Bibit/Stockbit**: Portfolio exports.
- **Logic**:
  - Deduplication: Check for existing transactions with the same timestamp and amount before saving.
  - Auto-Mapping: If the CSV says "GOPAY TOPUP", map it to the "Transportation" or "Other" category automatically.

---

## 4. 📈 Wealth Projection & Financial "What-If"
**Goal**: Predict future net worth based on current saving rates and investment performance.

### 🛠 Technical Approach
- **Compound Interest Engine**: Use current investment growth rates (from `StockChart` data) to project 5, 10, and 20 years into the future.
- **Simulation Mode**: "What if I saved Rp 1.000.000 more per month?" or "What if the market drops by 10%?".
- **Visualization**: A multi-line area chart showing "Conservative", "Balanced", and "Aggressive" growth scenarios.

---

## 5. 🔒 Advanced Privacy & Stealth Mode
**Goal**: Use the app in public without exposing sensitive balances.

### 🛠 Technical Approach
- **Global Blur State**: A Zustand or Context-based `isPrivate` state.
- **FaceID / Biometric Lock**: Integrate browser-based WebAuthn for re-authenticating when the tab has been inactive.
- **Fake Balances**: A "Stealth Mode" that multiplies all displayed numbers by a random factor (e.g., 0.1x) so onlookers see realistic but incorrect data.

---

## 6. 🎨 Customizable Layout (Widget System)
**Goal**: Allow users to personalize their Dashboard and Statistics pages.

### 🛠 Technical Approach
- **Grid System**: Use **React-Grid-Layout** or **dnd-kit** for the frontend.
- **Widget Registry**: Define standard "Widget" components (e.g., `SpendingPieWidget`, `BillSummaryWidget`).
- **Persistence**: Save a `layout_config` JSON blob to the user's profile in Supabase.
  - Format: `[{ "id": "pie-chart", "x": 0, "y": 0, "w": 2, "h": 2 }, ...]`
- **Features**:
  - Drag-and-drop cards to reorder information.
  - "Add/Remove Widget" menu to toggle visibility of specific charts or summaries.
  - Resizable components for high-priority data.

---

## 7. 🌍 Language Localization (i18n)
**Goal**: Allow users to toggle between English and Indonesian.

### 🛠 Technical Approach
- **Library**: Use `next-intl` or `react-i18next`.
- **Storage**: Save the user's language preference in `localStorage` or user metadata in Supabase.
- **Structure**:
  - `messages/en.json`
  - `messages/id.json`
- **Automation**: Use an LLM script to automatically translate new keys during development.

---

## 8. 🎯 Wishlist & Savings Goals (Budget Integration)
**Goal**: Allow users to set aside specific savings targets for items or goals within the Budget tab.

### 🛠 Technical Approach
- **Data Model**: Extend the existing `Budget` entity with a `wishlist` field or array.
- **Input Methods**:
  - **Manual**: User inputs item name and target price.
  - **Metadata Scraping**: User pastes a product URL; the system fetches metadata (like `og:price:amount`) to auto-populate the target price.
- **Progress Tracking**: 
  - Visualize progress (e.g., progress bar) as users "allocate" funds toward these targets.
  - No complex third-party APIs or automated price monitoring at this stage (keep it manual/client-side).
- **Future Growth**: Potential for alerts when prices change or automated savings transfers if banking integration is added.

---

## 🗂 Feature Status
| Feature | Priority | Complexity | Status |
| :--- | :--- | :--- | :--- |
| Budgeting & Limits | High | Medium | ✅ Implemented |
| Recurring Bills| High | Medium | ✅ Implemented |
| CSV Importer | Medium | Medium | ✅ Implemented |
| CSV Exporter | Medium | Low | ✅ Implemented |
| Wishlist & Savings Goals| Medium | Medium | ✅ Implemented |
| Language Localization (i18n) | Medium | Medium | 💡 Idea |
| Customizable Layout | High | High | 💡 Idea |
| Advanced Privacy | Medium | Medium | 💡 Idea |
| Open Finance Sync | Low | High | 🔬 Researching |
| Receipt OCR | Low | High | 💡 Idea |
