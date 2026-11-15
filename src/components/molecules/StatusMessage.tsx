import type { ComponentProps, ReactNode } from "react";
import { cva } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type StatusVariant = "info" | "success" | "warning" | "error";

// shadcn's Alert only knows "default" and "destructive". Our own colors come from
// the --info / --success / --warning tokens in globals.css (light and dark).
const statusStyles = cva("", {
  variants: {
    variant: {
      info: "border-info/30 bg-info/10 text-info",
      success: "border-success/30 bg-success/10 text-success",
      warning: "border-warning/30 bg-warning/10 text-warning",
      error: "border-destructive/30 bg-destructive/10 text-destructive",
    },
  },
  defaultVariants: { variant: "info" },
});

const icons = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
} as const;

interface StatusMessageProps extends Omit<ComponentProps<typeof Alert>, "variant" | "title"> {
  variant?: StatusVariant;
  title?: ReactNode;
}

// An inline message with an icon. Errors interrupt screen readers (role="alert"),
// everything else is announced politely (role="status").
export function StatusMessage({ variant = "info", title, children, className, ...props }: StatusMessageProps) {
  const Icon = icons[variant];
  return (
    <Alert
      role={variant === "error" ? "alert" : "status"}
      className={cn(statusStyles({ variant }), className)}
      {...props}
    >
      <Icon aria-hidden="true" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription className="text-current/90">{children}</AlertDescription>
    </Alert>
  );
}
