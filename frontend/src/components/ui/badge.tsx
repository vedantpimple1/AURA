"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium transition-colors";
    const variantStyles = {
      default: "bg-primary text-primary-foreground",
      outline: "border border-primary bg-transparent text-primary",
    };
    return (
      <span
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";

export default Badge;

