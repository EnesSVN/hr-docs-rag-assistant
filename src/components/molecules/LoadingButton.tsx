import type { ComponentProps } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoadingButtonProps extends ComponentProps<typeof Button> {
  loading?: boolean;
  // Shown instead of the normal label while loading.
  loadingText?: string;
}

// A button that cannot be clicked again while its action is running.
export function LoadingButton({ loading = false, loadingText, disabled, children, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={disabled || loading} aria-busy={loading} {...props}>
      {loading && <LoaderCircle className="animate-spin" aria-hidden="true" />}
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}
