"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary",
        className
      )}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  )
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
