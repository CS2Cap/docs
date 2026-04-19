"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell, ExternalLink, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAlerts, useRemoveFromWatchlistMutation, useWatchlist } from "@/lib/api";

export default function WatchlistPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { data: watchlist, isLoading } = useWatchlist({
    limit: 50,
    search: deferredSearch || undefined,
  });
  const { data: alerts } = useAlerts({ limit: 100 });
  const removeMutation = useRemoveFromWatchlistMutation();

  const alertCounts = new Map<number, number>();
  for (const alert of alerts?.alerts ?? []) {
    const count = alertCounts.get(alert.item.item_id) ?? 0;
    alertCounts.set(alert.item.item_id, count + 1);
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-mono text-xs tracking-widest text-primary mb-2">// WATCHLIST</div>
          <h1 className="text-3xl font-black tracking-tighter">WATCHLIST</h1>
        </div>
        <Button asChild>
          <Link href="/search">
            <Plus className="mr-2 h-4 w-4" />
            Browse Skins
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search watchlist..."
            className="bg-secondary/50 pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded bg-secondary/30" />
          <div className="h-24 animate-pulse rounded bg-secondary/30" />
          <div className="h-24 animate-pulse rounded bg-secondary/30" />
        </div>
      ) : watchlist && watchlist.items.length > 0 ? (
        <div className="space-y-3">
          {watchlist.items.map((item) => {
            const alertCount = alertCounts.get(item.item_id) ?? 0;

            return (
              <Card key={item.id} className="border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-secondary/50">
                      <span className="text-xs text-muted-foreground">#{item.item_id}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/item/${item.item_id}`}
                          className="truncate font-medium text-foreground transition-colors hover:text-primary"
                        >
                          {item.market_hash_name}
                        </Link>
                        {item.phase && <Badge variant="outline">{item.phase}</Badge>}
                        {alertCount > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <Bell className="h-3.5 w-3.5" />
                            {alertCount}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Added {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/item/${item.item_id}`} className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4" />
                            View Item
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/alerts?itemId=${item.item_id}`} className="flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            Manage Alerts
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center gap-2 text-destructive"
                          disabled={removeMutation.isPending}
                          onClick={() => removeMutation.mutate(item.item_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {removeMutation.isPending ? "Removing…" : "Remove"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">Nothing in your watchlist yet. Find items in search and hit Watch to add them.</p>
            <Button asChild>
              <Link href="/search">
                <Plus className="mr-2 h-4 w-4" />
                Browse Skins
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
