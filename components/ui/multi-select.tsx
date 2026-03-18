"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  const displayText =
    value.length === 0
      ? placeholder
      : value.length <= 2
        ? options.filter((o) => value.includes(o.value)).map((o) => o.label).join(", ")
        : `${value.length} selected`;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          !value.length && "text-muted-foreground"
        )}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            {options.map((opt) => {
              const isSelected = value.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent/50"
                  )}
                >
                  <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
                    {isSelected ? <Check className="h-4 w-4" /> : <span className="h-4 w-4 rounded border" />}
                  </span>
                  {opt.label}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
