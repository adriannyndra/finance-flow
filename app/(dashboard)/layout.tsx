'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PieChart, 
  Target, 
  Receipt, 
  ArrowLeftRight, 
  TrendingUp, 
  Settings,
  ChevronLeft,
  Menu
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', newState.toString());
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Statistics', href: '/statistics', icon: PieChart },
    { name: 'Budgets', href: '/budgets', icon: Target },
    { name: 'Bills', href: '/bills', icon: Receipt },
    { name: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
    { name: 'Investments', href: '/investments', icon: TrendingUp },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar for Desktop */}
      <aside 
        className={`hidden md:flex flex-col bg-white border-r border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className={`flex h-16 items-center border-b border-zinc-100 dark:border-zinc-800 px-6 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight transition-opacity duration-300">
              Finance<span className="text-emerald-600">Flow</span>
            </span>
          )}
          <button 
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : ''}
                className={`flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-50'
                } ${!isCollapsed ? 'mr-3' : ''}`} />
                {!isCollapsed && (
                  <span className="whitespace-nowrap opacity-100 transition-opacity duration-300">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-20 md:pb-0">
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 md:hidden">
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Finance<span className="text-emerald-600">Flow</span>
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-xs">
            JD
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-lg border-t border-zinc-200 flex items-center justify-around md:hidden dark:bg-zinc-900/80 dark:border-zinc-800 z-50 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-500'
                  : 'text-zinc-400 dark:text-zinc-500'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
