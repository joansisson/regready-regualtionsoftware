"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type TooltipContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function TooltipProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return <TooltipContext.Provider value={{ open, setOpen }}>{children}</TooltipContext.Provider>;
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function TooltipTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  if (asChild) {
    return <>{children}</>;
  }

  return <span>{children}</span>;
}

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { sideOffset?: number }
>(({ className, sideOffset: _sideOffset = 4, ...props }, ref) => {
  const context = React.useContext(TooltipContext);

  if (!context?.open) {
    return null;
  }

  return (
    <div
      ref={ref}
      role="tooltip"
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
        className
      )}
      {...props}
    />
  );
});

TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
