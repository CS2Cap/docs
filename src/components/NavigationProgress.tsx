"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function Bar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [completing, setCompleting] = useState(false);
  const navKey = `${pathname}?${searchParams.toString()}`;
  const prevKey = useRef(navKey);
  const cleanupTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (navKey !== prevKey.current) {
      prevKey.current = navKey;
      if (active) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActive(false);
        setCompleting(true);
        clearTimeout(cleanupTimer.current);
        cleanupTimer.current = setTimeout(() => setCompleting(false), 400);
      }
    }
  }, [navKey, active]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const a = (e.target as Element).closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank") return;
      try {
        const url = new URL(a.href, location.href);
        if (url.origin !== location.origin || url.href === location.href) return;
      } catch {
        return;
      }
      clearTimeout(cleanupTimer.current);
      setCompleting(false);
      setActive(true);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  if (!active && !completing) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-9999 h-0.5 bg-primary"
      style={{
        transformOrigin: "left",
        ...(active && !completing
          ? { animation: "nav-progress 2s cubic-bezier(0.1, 0.5, 0.8, 1) forwards" }
          : { transform: "scaleX(1)", opacity: 0, transition: "opacity 0.35s ease" }),
      }}
    />
  );
}

export function NavigationProgress() {
  return (
    <Suspense>
      <Bar />
    </Suspense>
  );
}
