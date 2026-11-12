"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used inside <Select>");
  }
  return context;
}

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = useSelectContext();
  return (
    <span className={cn("truncate", !value && "text-gray-400")}>
      {value || placeholder}
    </span>
  );
}

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = useSelectContext();
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
}

export function SelectContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { open } = useSelectContext();
  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white p-1 text-gray-900 shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SelectItem({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { value: selected, onValueChange, setOpen } = useSelectContext();
  return (
    <div
      role="option"
      aria-selected={selected === value}
      onClick={() => {
        onValueChange?.(value);
        setOpen(false);
      }}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm hover:bg-gray-100",
        className
      )}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {selected === value && <Check className="h-4 w-4" />}
      </span>
      {children}
    </div>
  );
}

export function SelectGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">{children}</div>;
}

export function SelectSeparator() {
  return <div className="-mx-1 my-1 h-px bg-gray-100" />;
}
