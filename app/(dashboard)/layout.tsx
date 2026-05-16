'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { name: 'Statistics', href: '/statistics', icon: '📊' },
    { name: 'Transactions', href: '/transactions', icon: '💸' },
    { name: 'Investments', href: '/investments', icon: '📈' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex h-16 items-center px-6">
          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Finance<span className="text-emerald-600">Flow</span>
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-4">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                pathname === item.href
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-20 md:pb-0">
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 md:hidden">
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Finance<span className="text-emerald-600">Flow</span>
          </span>
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
            JD
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-zinc-200 flex items-center justify-around md:hidden dark:bg-zinc-900 dark:border-zinc-800 z-50">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              pathname === item.href
                ? 'text-emerald-600'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] font-medium mt-1">{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
