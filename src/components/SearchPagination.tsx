"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SearchPaginationProps = {
  currentPage: number;
  totalPages: number;
  prevHref: string;
  nextHref: string;
  hasPrev: boolean;
  hasNext: boolean;
};

export function SearchPagination({
  currentPage,
  totalPages,
  prevHref,
  nextHref,
  hasPrev,
  hasNext,
}: SearchPaginationProps) {
  const router = useRouter();
  const [pendingPage, setPendingPage] = useState<number | null>(null);

  useEffect(() => {
    if (hasPrev) {
      router.prefetch(prevHref);
    }

    if (hasNext) {
      router.prefetch(nextHref);
    }
  }, [hasNext, hasPrev, nextHref, prevHref, router]);

  function navigate(href: string, targetPage: number, enabled: boolean) {
    if (!enabled || pendingPage != null) {
      return;
    }

    setPendingPage(targetPage);
    startTransition(() => {
      router.push(href, { scroll: true });
    });
  }

  const isPending = pendingPage != null;

  return (
    <div className="mt-8 flex items-center justify-between" aria-busy={isPending}>
      <button
        type="button"
        onClick={() => navigate(prevHref, currentPage - 1, hasPrev)}
        disabled={!hasPrev || isPending}
        className={`border-brutal px-4 py-2 font-mono text-xs tracking-wider ${
          hasPrev && !isPending ? "text-foreground brutalist-hover hover:border-primary" : "opacity-40"
        }`}
      >
        PREV
      </button>
      <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
        {isPending ? `LOADING PAGE ${pendingPage}...` : `PAGE ${currentPage} / ${totalPages}`}
      </div>
      <button
        type="button"
        onClick={() => navigate(nextHref, currentPage + 1, hasNext)}
        disabled={!hasNext || isPending}
        className={`border-brutal px-4 py-2 font-mono text-xs tracking-wider ${
          hasNext && !isPending ? "text-foreground brutalist-hover hover:border-primary" : "opacity-40"
        }`}
      >
        NEXT
      </button>
    </div>
  );
}
