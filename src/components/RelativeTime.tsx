"use client";

import { useEffect, useState } from "react";

export function formatRelativeTime(value?: string | null) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return null;
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function useRelativeTime(value?: string | null) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const compute = () => setLabel(formatRelativeTime(value));
    compute();
    const id = setInterval(compute, 30_000);
    return () => clearInterval(id);
  }, [value]);
  return label;
}

export function RelativeTime({ value }: { value?: string | null }) {
  const label = useRelativeTime(value);
  return (
    <span suppressHydrationWarning className="font-mono text-xs text-foreground/70">
      {label ?? "—"}
    </span>
  );
}
