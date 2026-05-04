import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STEAM_CDN_BASE = "https://community.akamai.steamstatic.com/economy/image";

/**
 * Build a Steam CDN URL from the raw `icon_url` fragment returned by the
 * Steam inventory API. Already-absolute URLs are returned unchanged so the
 * helper is safe to call on any source.
 */
export function steamIconUrl(
  iconUrl: string | null | undefined,
  size: "96fx96f" | "128fx128f" | "256fx256f" = "96fx96f",
): string | null {
  if (!iconUrl) return null;
  if (iconUrl.startsWith("http://") || iconUrl.startsWith("https://")) {
    return iconUrl;
  }
  return `${STEAM_CDN_BASE}/${iconUrl}/${size}`;
}
