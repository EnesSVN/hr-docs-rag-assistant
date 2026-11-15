"use client";

import type { ReactNode } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  "aria-label": string;
  // Show only the icons; the label is still read by screen readers.
  iconOnly?: boolean;
  className?: string;
}

// An iOS-style segmented control: one option is always selected.
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  iconOnly = false,
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      // Radix sends "" when the selected item is clicked again. A segmented control
      // must always keep one selection, so that is ignored.
      onValueChange={(next) => {
        if (next) onValueChange(next as T);
      }}
      spacing={0}
      aria-label={ariaLabel}
      className={cn("rounded-xl bg-muted p-0.5 ring-1 ring-inset ring-border", className)}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={iconOnly ? option.label : undefined}
          className="h-7 gap-1.5 rounded-[10px] px-2.5 text-xs font-medium text-muted-foreground transition-all duration-200 ease-apple hover:bg-transparent hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-soft"
        >
          {option.icon}
          {!iconOnly && option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
