'use client';

import { Bell, Search, User } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';

export function AppHeader() {
  const [hasClerkKeys, setHasClerkKeys] = useState(false);
  const [UserButton, setUserButton] = useState<any>(null);

  useEffect(() => {
    // Check if Clerk is configured
    const clerkConfigured =
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== 'your_clerk_publishable_key';

    setHasClerkKeys(!!clerkConfigured);

    // Dynamically import UserButton only if Clerk is configured
    if (clerkConfigured) {
      import('@clerk/nextjs').then((clerk) => {
        setUserButton(() => clerk.UserButton);
      });
    }
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              type="search"
              placeholder="Search projects, specs, tasks..."
              className="pl-10 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </Button>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* User menu */}
          {hasClerkKeys && UserButton ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-9 w-9',
                },
              }}
            />
          ) : (
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
