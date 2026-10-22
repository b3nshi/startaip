"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

/** Submit button that disables itself while its form's action is running, so a slow request cannot be fired twice. */
export function SubmitButton({ className = "", disabled, ...props }: ComponentProps<"button">) {
  const { pending } = useFormStatus();
  return <button {...props} disabled={pending || disabled} aria-busy={pending} className={`${className} disabled:cursor-not-allowed disabled:opacity-50`} />;
}
