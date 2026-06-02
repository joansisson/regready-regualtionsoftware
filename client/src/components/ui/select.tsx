"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Check } from "lucide-react";

import { cn } from "@/lib/utils";

type SelectContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

const Select = ({
  children,
  value,
  onValueChange,
  disabled,
}: {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) => {
  return (
    <SelectContext.Provider value={{ value, onValueChange, disabled }}>
      <div>{children}</div>
    </SelectContext.Provider>
  );
};

const SelectGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const context = React.useContext(SelectContext);
  return <span>{context?.value || placeholder || "Select an option"}</span>;
};

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, disabled, ...props }, ref) => {
  const context = React.useContext(SelectContext);

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      disabled={disabled || context?.disabled}
      {...props}
    >
      <span className="truncate">{children}</span>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectScrollUpButton = ({ className }: { className?: string }) => (
  <div className={cn("flex cursor-default items-center justify-center py-1", className)}>
    <ChevronUp className="h-4 w-4" />
  </div>
);

const SelectScrollDownButton = ({ className }: { className?: string }) => (
  <div className={cn("flex cursor-default items-center justify-center py-1", className)}>
    <ChevronDown className="h-4 w-4" />
  </div>
);

const SelectContent = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={cn("mt-1 rounded-md border bg-popover text-popover-foreground shadow-md", className)}>
      <SelectScrollUpButton />
      <div className="max-h-60 overflow-y-auto p-1">{children}</div>
      <SelectScrollDownButton />
    </div>
  );
};

const SelectLabel = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={cn("py-1.5 pl-2 pr-2 text-sm font-semibold", className)}>{children}</div>;

const SelectItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, children, value, onClick, ...props }, ref) => {
  const context = React.useContext(SelectContext);
  const isSelected = context?.value === value;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    context?.onValueChange?.(value);
    onClick?.(event);
  };

  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={isSelected}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected ? <Check className="h-4 w-4" /> : null}
      </span>
      <span className="truncate">{children}</span>
    </button>
  );
});
SelectItem.displayName = "SelectItem";

const SelectSeparator = ({ className }: { className?: string }) => (
  <div className={cn("-mx-1 my-1 h-px bg-muted", className)} />
);

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
