import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { FormField } from "./FormField";

interface FileFieldProps extends Omit<ComponentProps<typeof Input>, "type" | "onChange" | "id"> {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  // Called with the chosen file, or null when the choice is cleared.
  onFileChange: (file: File | null) => void;
}

// A labelled file picker. Only picks the file; sending it is the parent's job.
export function FileField({ label, description, error, onFileChange, ...inputProps }: FileFieldProps) {
  return (
    <FormField label={label} description={description} error={error}>
      {(control) => (
        <Input
          type="file"
          {...control}
          {...inputProps}
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
      )}
    </FormField>
  );
}
