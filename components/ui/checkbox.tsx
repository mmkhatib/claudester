'use client';

import * as React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', checked = false, onCheckedChange, ...props }, ref) => {
    const baseStyles = 'peer h-4 w-4 shrink-0 rounded-sm border border-zinc-300 dark:border-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
    };

    return (
      <div className="relative inline-flex items-center">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          className={`${baseStyles} ${className} appearance-none`}
          {...props}
        />
        {checked && (
          <Check className="absolute h-3 w-3 text-white pointer-events-none left-0.5 top-0.5" />
        )}
        <style jsx>{`
          input[type='checkbox']:checked {
            background-color: rgb(37, 99, 235);
            border-color: rgb(37, 99, 235);
          }
          input[type='checkbox']:checked:dark {
            background-color: rgb(59, 130, 246);
            border-color: rgb(59, 130, 246);
          }
        `}</style>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
