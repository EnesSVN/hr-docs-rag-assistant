import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface IconButtonProps extends Omit<ComponentProps<typeof Button>, "size" | "children" | "aria-label"> {
  icon: ReactNode;
  // Required: a button with only an icon has no name for screen readers otherwise.
  label: string;
}

// A square button that shows only an icon.
export function IconButton({ icon, label, variant = "ghost", ...props }: IconButtonProps) {
  return (
    <Button size="icon" variant={variant} aria-label={label} title={label} {...props}>
      <span aria-hidden="true" className="contents">
        {icon}
      </span>
    </Button>
  );
}
