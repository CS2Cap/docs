"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

type ReplayCategory = "marketing" | "pricing" | "engaged" | "none";

const MARKETING_REPLAY_SAMPLE_RATE = 0.1;
const PRICING_REPLAY_SAMPLE_RATE = 0.5;
const REPLAY_SAMPLE_STORAGE_KEY = "cs2cap:posthog-replay-samples:v1";

const ENGAGED_PATH_PREFIXES = [
  "/account",
  "/alerts",
  "/auth/exchange",
  "/dashboard",
  "/inventory-value",
  "/item",
  "/login",
  "/search",
  "/verify-email",
  "/watchlist",
];

const NON_MARKETING_PATHS = new Set([
  "/api-info",
  "/inventory-value",
  "/login",
  "/privacy",
  "/search",
  "/terms",
  "/verify-email",
]);

type StoredSamples = Partial<Record<ReplayCategory, boolean>>;

function getCurrentHash() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.hash;
}

function classifyReplayCategory(pathname: string, hash: string): ReplayCategory {
  if (pathname === "/api-info") {
    return hash === "#pricing" ? "pricing" : "engaged";
  }

  if (ENGAGED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return "engaged";
  }

  if (pathname === "/" || (pathname.endsWith("-api") && !NON_MARKETING_PATHS.has(pathname))) {
    return "marketing";
  }

  return "none";
}

function getSampleRate(category: ReplayCategory) {
  switch (category) {
    case "marketing":
      return MARKETING_REPLAY_SAMPLE_RATE;
    case "pricing":
      return PRICING_REPLAY_SAMPLE_RATE;
    case "engaged":
      return 1;
    case "none":
      return 0;
  }
}

function readStoredSamples(): StoredSamples {
  try {
    const raw = window.localStorage.getItem(REPLAY_SAMPLE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSamples) : {};
  } catch {
    return {};
  }
}

function shouldRecordReplay(category: ReplayCategory) {
  const sampleRate = getSampleRate(category);
  if (sampleRate <= 0) return false;
  if (sampleRate >= 1) return true;

  const stored = readStoredSamples();
  if (typeof stored[category] === "boolean") {
    return stored[category];
  }

  const sampled = Math.random() < sampleRate;
  try {
    window.localStorage.setItem(
      REPLAY_SAMPLE_STORAGE_KEY,
      JSON.stringify({ ...stored, [category]: sampled }),
    );
  } catch {
    // Sampling still works for this page even if storage is unavailable.
  }
  return sampled;
}

function onIdle(callback: () => void) {
  if ("requestIdleCallback" in window) {
    const idleId = window.requestIdleCallback(callback, { timeout: 2000 });
    return () => window.cancelIdleCallback(idleId);
  }

  const timeoutId = globalThis.setTimeout(callback, 1000);
  return () => globalThis.clearTimeout(timeoutId);
}

function captureNavigationIntent(event: MouseEvent) {
  const link = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
  if (!link) return;

  let url: URL;
  try {
    url = new URL(link.href, window.location.href);
  } catch {
    return;
  }

  const label = link.textContent?.trim().replace(/\s+/g, " ").slice(0, 120) || undefined;
  const target = `${url.pathname}${url.hash}`;

  if (target === "/pricing" || target === "/api-info#pricing" || label?.toLowerCase().includes("pricing")) {
    posthog.capture("pricing_clicked", { href: target, label });
    return;
  }

  if (url.hostname === "docs.cs2cap.com") {
    posthog.capture("docs_clicked", { href: url.toString(), label });
    return;
  }

  if (url.pathname === "/login" || label?.toLowerCase().includes("sign")) {
    posthog.capture("signup_clicked", { href: target, label });
  }
}

export function PostHogReplayPolicy() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hash, setHash] = useState(getCurrentHash);
  const routeKey = `${pathname}?${searchParams.toString()}${hash}`;
  const category = useMemo(() => classifyReplayCategory(pathname, hash), [pathname, hash]);

  useEffect(() => {
    function syncHash() {
      setHash(getCurrentHash());
    }

    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    document.addEventListener("click", captureNavigationIntent);
    return () => document.removeEventListener("click", captureNavigationIntent);
  }, []);

  useEffect(() => {
    if (!shouldRecordReplay(category)) {
      posthog.stopSessionRecording();
      return;
    }

    return onIdle(() => {
      posthog.startSessionRecording(true);
    });
  }, [category, routeKey]);

  return null;
}
