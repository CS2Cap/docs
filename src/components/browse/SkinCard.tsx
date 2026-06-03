import Link from "next/link";
import Image from "next/image";
import type { SkinCard as SkinCardData } from "@/lib/browse/taxonomy";

export function SkinCard({ skin }: { skin: SkinCardData }) {
  return (
    <div
      className="group relative flex flex-col border-2 border-border bg-card transition-colors hover:border-primary"
      style={skin.rarityColor ? { borderTopColor: `#${skin.rarityColor}` } : undefined}
    >
      <Link href={skin.itemHref} className="block aspect-4/3 bg-muted/30">
        {skin.image ? (
          <Image
            src={skin.image}
            alt={skin.skinName ?? skin.baseName}
            width={256}
            height={192}
            className="h-full w-full object-contain p-3"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted-foreground">
            NO IMAGE
          </div>
        )}
      </Link>
      <div className="flex flex-col gap-0.5 p-2">
        {skin.weaponHref ? (
          <Link
            href={skin.weaponHref}
            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary"
          >
            {skin.baseName}
          </Link>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {skin.topLabel ?? skin.baseName}
          </span>
        )}
        <Link
          href={skin.itemHref}
          className="font-mono text-sm font-semibold text-foreground hover:text-primary"
        >
          {skin.skinName ?? skin.baseName}
        </Link>
      </div>
    </div>
  );
}
