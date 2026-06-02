"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type SeparatorProps = React.HTMLAttributes<HTMLHRElement> & {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
};

const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => {
    return (
      <hr
        ref={ref}
        role={decorative ? "none" : "separator"}
        aria-orientation={orientation}
        className={cn(
          "shrink-0 bg-border border-0",
          orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
          className
        )}
        {...props}
      />
    );
  }
);

Separator.displayName = "Separator";

export { Separator };
