"use client";

import { forwardRef } from "react";

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked = false, onCheckedChange, indeterminate = false, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
        {...props}
      />
    );
  }
);

Checkbox.displayName = "Checkbox";
