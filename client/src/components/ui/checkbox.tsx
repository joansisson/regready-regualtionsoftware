"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <label
        className={cn(
          "peer relative inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-primary ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(event) => onCheckedChange?.(event.target.checked)}
          {...props}
        />
        <span
          data-state={checked ? "checked" : "unchecked"}
          className={cn(
            "flex h-full w-full items-center justify-center rounded-sm",
            checked ? "bg-primary text-primary-foreground" : "bg-transparent"
          )}
        >
          {checked ? <Check className="h-4 w-4" /> : null}
        </span>
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
