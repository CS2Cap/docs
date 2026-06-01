"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useItemSearch } from "@/lib/api";
import type { ItemSuggestion } from "@/lib/api/types";

export type AlertItemSelection = {
  item_id: number;
  market_hash_name: string;
};

function itemSubtitle(item: ItemSuggestion): string {
  return [item.item_type, item.wear_name].filter(Boolean).join(" · ");
}

export function ItemSearchInput({
  id,
  value,
  onSelect,
  placeholder = "Search items by name…",
}: {
  id?: string;
  value: AlertItemSelection | null;
  onSelect: (item: AlertItemSelection | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value?.market_hash_name ?? "");
  const [debounced, setDebounced] = useState(query);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reflect a selection pushed in from outside (e.g. arriving via
  // /alerts?itemId=… where the name resolves async). Adjusting state during
  // render is React's recommended alternative to a prop→state sync effect.
  const valueId = value?.item_id ?? null;
  const [prevValueId, setPrevValueId] = useState(valueId);
  if (valueId !== prevValueId) {
    setPrevValueId(valueId);
    if (value?.market_hash_name) {
      setQuery(value.market_hash_name);
    }
  }

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

  function selectItem(item: ItemSuggestion) {
    onSelect({ item_id: item.item_id, market_hash_name: item.market_hash_name });
    setQuery(item.market_hash_name);
    setOpen(false);
  }

  function clear() {
    setQuery("");
    onSelect(null);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlighted((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      const item = results[highlighted];
      if (showDropdown && item) {
        event.preventDefault();
        selectItem(item);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
        {value ? (
          <Check className="h-4 w-4 text-green-400" />
        ) : (
          <Search className="h-4 w-4 text-muted-foreground" />
        )}
      </span>
      <Input
        id={id}
        value={query}
        autoComplete="off"
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        className="px-9"
        onChange={(event) => {
          setQuery(event.target.value);
          setHighlighted(0);
          setOpen(true);
          if (value) onSelect(null);
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
            aria-label="Clear"
            onClick={clear}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </span>

      {showDropdown ? (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              {isFetching ? "Searching…" : "No items found"}
            </li>
          ) : (
            results.map((item, index) => (
              <li key={item.item_id} role="option" aria-selected={index === highlighted}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => selectItem(item)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left",
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
                    <span className="block truncate text-sm text-foreground">
                      {item.market_hash_name}
                    </span>
                    {itemSubtitle(item) ? (
                      <span className="block truncate text-xs text-muted-foreground">
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
    </div>
  );
}
