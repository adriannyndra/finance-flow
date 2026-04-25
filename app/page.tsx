'use client';

export default function LoginPage() {
  const handleLogin = () => {
    console.log("Login triggered, navigating to dashboard...");
    // Use window.location for a "hard" redirect which is 
    // much more reliable through tunnels like Cloudflare.
    window.location.href = '/dashboard';
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {/* Finance<span className="text-emerald-600">Flow</span> */}
            jenengi dewe <span className="text-emerald-600"> aplikasie</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Smart money management for everyone. LOL
          </p>
        </div>

        {/* Removed <form> to prevent browser native submission over proxy */}
        <div className="mt-8 space-y-6 bg-white p-8 shadow-xl rounded-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <a
              href="/dashboard"
              className="flex w-full justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-colors text-center"
            >
              Sign in
            </a>
          </div>
        </div>

        {/* <p className="mt-6 text-center text-sm text-zinc-500">
          Not a member?{' '}
          <a href="#" className="font-semibold text-emerald-600 hover:text-emerald-500">
            Start a 14-day free trial
          </a>
        </p> */}
      </div>
    </div>
  );
}
