// Client-safe browse-nav types. Intentionally NO "server-only" import so this
// can be imported by both the API route (server) and the menu/hook (client).
import type { WeaponSubtype } from "./taxonomy";

export interface BrowseNavItem {
  name: string;
  href: string;
  image: string | null;
}

export interface BrowseNavData {
  weapons: Record<WeaponSubtype, BrowseNavItem[]>;
  knives: BrowseNavItem[];
  gloves: BrowseNavItem[];
  agents: BrowseNavItem[];
  cases: BrowseNavItem[];
  collections: BrowseNavItem[];
  stickers: BrowseNavItem[];
  slabs: BrowseNavItem[];
  charms: BrowseNavItem[];
  graffiti: BrowseNavItem[];
  musicKits: BrowseNavItem[];
  patches: BrowseNavItem[];
  collectibles: BrowseNavItem[];
}
