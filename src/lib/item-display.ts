export type ItemNameTag = "st" | "sv" | null;

const ITEM_STRIP_PREFIXES = ["Sticker | ", "Souvenir Charm | ", "Graffiti | ", "Music Kit | ", "Autograph Capsule | "];
const ITEM_STRIP_SUFFIXES = [
  " (Factory New)",
  " (Minimal Wear)",
  " (Field-Tested)",
  " (Well-Worn)",
  " (Battle-Scarred)",
];

export function formatItemDisplay(rawName: string): { star: boolean; prefix: string | null; name: string; tag: ItemNameTag } {
  let name = rawName;
  let tag: ItemNameTag = null;
  let prefix: string | null = null;
  let star = false;

  for (const p of ITEM_STRIP_PREFIXES) {
    if (name.startsWith(p)) {
      name = name.slice(p.length);
      break;
    }
  }

  if (name.startsWith("★ StatTrak™ ")) {
    name = name.slice("★ StatTrak™ ".length);
    prefix = "ST";
    tag = "st";
    star = true;
  } else if (name.startsWith("StatTrak™ ")) {
    name = name.slice("StatTrak™ ".length);
    prefix = "ST";
    tag = "st";
  } else if (name.startsWith("Souvenir ")) {
    name = name.slice("Souvenir ".length);
    prefix = "SV";
    tag = "sv";
  }

  for (const suffix of ITEM_STRIP_SUFFIXES) {
    if (name.endsWith(suffix)) {
      name = name.slice(0, -suffix.length);
      break;
    }
  }

  return { star, prefix, name, tag };
}

export function itemTagFrameClass(tag: ItemNameTag): string {
  if (tag === "st") return "border-orange-500/70";
  if (tag === "sv") return "border-yellow-400/70";
  return "border-border";
}

export function itemTagTextClass(tag: ItemNameTag): string {
  if (tag === "st") return "text-orange-400";
  if (tag === "sv") return "text-yellow-400";
  return "";
}
