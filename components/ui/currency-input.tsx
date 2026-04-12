import * as React from "react";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number; // value in cents
  onChange: (value: number) => void; // returns value in cents
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    // Format cents to lempiras for display
    const formatDisplayValue = (cents: number): string => {
      const lempiras = cents / 100;
      return new Intl.NumberFormat('es-HN', {
        style: 'currency',
        currency: 'HNL',
        minimumFractionDigits: 2,
      }).format(lempiras);
    };

    // Parse input string to cents
    const parseInputToCents = (input: string): number => {
      // Remove all non-digit characters except decimal point
      const cleanInput = input.replace(/[^\d.]/g, '');
      
      // Split on decimal point and handle cents
      const parts = cleanInput.split('.');
      let lempiras = parseInt(parts[0] || '0', 10);
      let cents = 0;
      
      if (parts.length > 1) {
        // Take first two digits of cents part
        const centsStr = parts[1].padEnd(2, '0').slice(0, 2);
        cents = parseInt(centsStr, 10);
      }
      
      return lempiras * 100 + cents;
    };

    const [displayValue, setDisplayValue] = React.useState(() => 
      formatDisplayValue(value)
    );

    // Update display value when prop value changes
    React.useEffect(() => {
      setDisplayValue(formatDisplayValue(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      setDisplayValue(input);
      
      // Only parse if input is not empty
      if (input.trim()) {
        const cents = parseInputToCents(input);
        onChange(cents);
      } else {
        onChange(0);
      }
    };

    const handleBlur = () => {
      // Reformat on blur to ensure proper currency format
      setDisplayValue(formatDisplayValue(value));
    };

    return (
      <input
        type="text"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="L. 0.00"
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
