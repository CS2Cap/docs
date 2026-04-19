"use client";

import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAddToWatchlistMutation, useSession } from "@/lib/api";

export function WatchItemButton({
  itemId,
  compact = false,
}: {
  itemId: number;
  compact?: boolean;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const mutation = useAddToWatchlistMutation();

  return (
    <Button
      type="button"
      variant={compact ? "outline" : "default"}
      size={compact ? "sm" : "default"}
      onClick={() => {
        if (!session) {
          router.push("/login");
          return;
        }

        mutation.mutate(itemId, {
          onSuccess: () => toast.success("Added to watchlist"),
          onError: (error) => toast.error(error.message || "Could not add to watchlist"),
        });
      }}
      disabled={mutation.isPending}
    >
      <Eye className="mr-2 h-4 w-4" />
      {mutation.isPending ? "Saving..." : compact ? "Watch" : "Add to Watchlist"}
    </Button>
  );
}
