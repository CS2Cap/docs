"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Loader2, X } from "lucide-react";
import { useItemSearch } from "@/lib/api";
import type { ItemSuggestion } from "@/lib/api/types";
import { buildItemPath } from "@/lib/seo/itemSlug";
import { cn } from "@/lib/utils";

function itemSubtitle(item: ItemSuggestion): string {
  return [item.item_type, item.wear_name].filter(Boolean).join(" · ");
}

// Global navbar search with item autosuggestions. Reuses the same debounced
// `useItemSearch` flow as the Alerts ItemSearchInput, but navigates: picking a
// suggestion opens that item, while a plain Enter goes to the search page.
export function GlobalSearchInput({
  className,
  inputClassName,
  onNavigate,
}: {
  className?: string;
  inputClassName?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data: results = [], isFetching } = useItemSearch(open ? debounced : "");
  const showDropdown = open && debounced.trim().length >= 2;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function goToItem(item: ItemSuggestion) {
    setOpen(false);
    setQuery("");
    onNavigate?.();
    router.push(buildItemPath(item.item_id, item.market_hash_name));
  }

  function goToSearch() {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    setQuery("");
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (showDropdown && highlighted >= 0 && results[highlighted]) {
      goToItem(results[highlighted]);
    } else {
      goToSearch();
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlighted((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(index - 1, 0));
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <form ref={containerRef} onSubmit={handleSubmit} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <input
        type="text"
        value={query}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls="global-search-listbox"
        placeholder="Search items..."
        className={cn(
          "h-10 w-full bg-muted/50 border border-border pl-8 pr-8 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors",
          inputClassName,
        )}
        onChange={(event) => {
          setQuery(event.target.value);
          setHighlighted(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2">
        {isFetching ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </span>

      {showDropdown ? (
        <ul
          id="global-search-listbox"
          role="listbox"
          className="absolute inset-x-0 z-50 mt-1 max-h-80 overflow-auto rounded-none border-2 border-border bg-popover p-1 shadow-lg scrollbar-none"
        >
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center font-mono text-xs text-muted-foreground">
              {isFetching ? "Searching…" : "No items found"}
            </li>
          ) : (
            results.map((item, index) => (
              <li key={item.item_id} role="option" aria-selected={index === highlighted}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => goToItem(item)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-none px-2 py-2 text-left",
                    index === highlighted ? "bg-accent" : "hover:bg-accent/50",
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary/50">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt=""
                        width={36}
                        height={36}
                        className="h-full w-full object-contain p-0.5"
                      />
                    ) : (
                      <span className="h-3 w-3 rounded-sm bg-primary/30" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-sm text-foreground">
                      {item.market_hash_name}
                    </span>
                    {itemSubtitle(item) ? (
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {itemSubtitle(item)}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </form>
  );
}
