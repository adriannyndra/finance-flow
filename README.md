# Finance Manager

A modern personal finance management application built with **Next.js**, **Supabase**, and **Tailwind CSS**, following **Clean Architecture** principles.

[![Deploy with Vercel](https://vercel.com/button)](https://finance-manager-orpin-phi.vercel.app/)

## 🚀 Features

- **Dashboard**: Overview of your financial health with interactive charts.
- **Transactions**: Track income and expenses with ease.
- **Investments**: Monitor your portfolio and stock history.
- **Authentication**: Secure login and password management via Supabase.
- **Responsive Design**: Optimized for both desktop and mobile devices.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Financial Data**: [Yahoo Finance2](https://github.com/gadicc/node-yahoo-finance2)

## 🏗️ Architecture

This project strictly adheres to **Clean Architecture** using **Vertical Slices**. This ensures that business logic is decoupled from the framework and infrastructure.

### Key Layers:
- **`core/`**: Shared domain entities and pure formatting logic.
- **`features/`**: Business logic isolated by feature (Domain, Use Cases, Infrastructure).
- **`app/`**: Presentation layer (Next.js pages and components).
- **`utils/`**: Global infrastructure configurations (Supabase client, etc.).

For more details, see [CLEAN_ARCHITECTURE.md](./CLEAN_ARCHITECTURE.md).

## 🏁 Getting Started

### Prerequisites
- Node.js 20+
- npm / yarn / pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/finance-manager.git
   cd finance-manager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.example.env.local` to `.env.local` and fill in your Supabase credentials.
   ```bash
   cp .example.env.local .env.local
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📂 Project Structure

```text
├── app/              # Next.js App Router (Presentation)
├── components/       # Shared UI components
├── core/             # Shared domain entities & formatters
├── features/         # Vertical slices (Domain, Use Cases, Infrastructure)
│   ├── dashboard/
│   └── transactions/
├── lib/              # Mock data and shared libraries
├── public/           # Static assets
└── utils/            # Global infrastructure (Supabase, Auth)
```

## 📜 License

This project is private and intended for personal use.
