"use client";

import { useEffect, useRef, useState } from "react";

/** Copies the email; falls back to opening the mail app if the clipboard is blocked. */
export function CopyEmail({ email, className }: { email: string; className: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(email);
          setCopied(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 1600);
        } catch {
          window.location.href = `mailto:${email}`;
        }
      }}
    >
      <span key={copied ? "y" : "n"}>{copied ? "Copied" : "Copy email"}</span>
    </button>
  );
}
