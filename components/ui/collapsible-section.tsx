'use client';

import { useState, useEffect, ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  defaultCollapsed?: boolean;
  storageKey: string; // Unique key for localStorage
  badge?: ReactNode;
}

export function CollapsibleSection({
  title,
  description,
  children,
  defaultCollapsed = false,
  storageKey,
  badge,
}: CollapsibleSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [mounted, setMounted] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(storageKey);
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
    setMounted(true);
  }, [storageKey]);

  // Save collapsed state to localStorage when it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(storageKey, String(isCollapsed));
    }
  }, [isCollapsed, storageKey, mounted]);

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        onClick={toggleCollapsed}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5 text-zinc-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-zinc-500" />
            )}
            <div className="flex-1">
              <CardTitle>{title}</CardTitle>
              {description && !isCollapsed && (
                <CardDescription className="mt-1.5">{description}</CardDescription>
              )}
            </div>
          </div>
          {badge && <div onClick={(e) => e.stopPropagation()}>{badge}</div>}
        </div>
      </CardHeader>
      {!isCollapsed && <CardContent>{children}</CardContent>}
    </Card>
  );
}
