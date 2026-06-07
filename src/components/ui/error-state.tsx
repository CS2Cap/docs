import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ErrorStateProps = {
  eyebrow?: string;
  title: string;
  message: ReactNode;
  action?: ReactNode;
  className?: string;
  size?: "default" | "compact";
};

export function ErrorState({
  eyebrow = "ERROR",
  title,
  message,
  action,
  className,
  size = "default",
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "border-2 border-border bg-card font-mono",
        size === "compact" ? "p-4" : "p-8",
        className,
      )}
    >
      <div className="text-xs font-bold tracking-widest text-primary">// {eyebrow}</div>
      <h2
        className={cn(
          "mt-3 font-black tracking-tighter text-foreground",
          size === "compact" ? "text-lg" : "text-2xl",
        )}
      >
        {title}
      </h2>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{message}</div>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
