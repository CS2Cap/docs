"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

export default function ItemDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="container py-8">
      <ErrorState
        eyebrow="ITEM"
        title="Item page unavailable"
        message={error.message || "Couldn't load this item page. Please try again."}
        action={
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={reset}>
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href="/search">Back to Search</Link>
            </Button>
          </div>
        }
      />
    </main>
  );
}
