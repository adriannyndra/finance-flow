# Finance Manager

A modern personal finance management application built with **Next.js**, **Supabase**, and **Tailwind CSS**, following **Clean Architecture** principles.

[![Deploy with Vercel](https://vercel.com/button)](https://finance-manager-orpin-phi.vercel.app/)

## 🚀 Features

- **Advanced Bill Management**:
  - **Archiving**: Fully paid bills automatically move to a dedicated history section.
  - **Roadmaps**: View and manage detailed payment schedules for installments and subscriptions.
  - **Pre-payment**: Clear future obligations ahead of time with smart "Early Bird" payment logic.
  - **Manual Solver**: Smart form buttons to auto-calculate totals, amounts, or deadlines.
- **Deep Analytics**:
  - **Bill Breakdown**: Analyze spending by Type (Subscription vs. Debt) or Category.
  - **Historical Reports**: Stats include both active and archived commitments for complete reporting.
  - **Cash Flow**: Track monthly income vs. expenses over time.
- **Transactions**: Track income and expenses with advanced filtering, sorting, and Lucide-powered UI.
- **Wishlist & Savings Goals**: Set and track long-term saving targets integrated directly with your monthly budget.
- **Investments**: Monitor your portfolio and stock history with interactive charts.
- **Advanced Statistics**: Analyze month-over-month cash flow, net worth trends, and investment performance with visual insights.
- **Privacy Masking**: Built-in user-derived masking to keep financial amounts obscured in the database.
- **Responsive Design**: Minimalist, mobile-first navigation with icon-only bottom bar.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15+ (App Router)](https://nextjs.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🐳 Docker Support

You can run this application using Docker for a consistent environment.

### Production Build
```bash
docker compose up --build
```

### Development Mode (with hot-reloading)
```bash
docker compose -f docker-compose.dev.yml up
```

## 🏗️ Architecture

This project strictly adheres to **Clean Architecture** using **Vertical Slices**. This ensures that business logic is decoupled from the framework and infrastructure.

### Key Layers:
- **`core/`**: Shared domain entities and pure formatting logic.
- **`features/`**: Business logic isolated by feature (Domain, Use Cases, Infrastructure).
- **`app/`**: Presentation layer (Next.js pages and components).
- **`utils/`**: Global infrastructure configurations (Supabase client, etc.).

For more details, see [CLEAN_ARCHITECTURE.md](./CLEAN_ARCHITECTURE.md).

## 📂 Project Structure

```text
├── app/              # Next.js App Router (Presentation)
├── components/       # Shared UI components
├── core/             # Shared domain entities & formatters
├── features/         # Vertical slices (Domain, Use Cases, Infrastructure)
│   ├── bills/        # Archiving, Roadmaps, Pre-payment logic
│   ├── budgets/      # Thresholds and progress tracking
│   └── transactions/ # Core ledger and categorization
├── utils/            # Global infrastructure (Supabase, Auth)
```

## 📚 Project Documentation

- [Project Intelligence (Gemini)](./GEMINI.md): Team-shared conventions, security, and workflows.
- [Clean Architecture](./CLEAN_ARCHITECTURE.md): Architectural patterns and guidelines.
- [Database Schema](./DATABASE_SCHEMA.md): Supabase table structures and masking logic.
- [Agent Management](./AGENTS.md): Guide for working with project agents.

- [Todo List](./TODO.md): Task tracking and backlog.

## 📜 License

This project is private and intended for personal use.
