import Link from "next/link";
import Image from "next/image";

export function GroupCard({
  href,
  name,
  image,
  count,
  noun = "skin",
}: {
  href: string;
  name: string;
  image: string | null;
  count: number;
  noun?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col border-2 border-border bg-card transition-colors hover:border-primary"
    >
      <div className="flex aspect-4/3 items-center justify-center bg-muted/30">
        {image ? (
          <Image
            src={image}
            alt={name}
            width={256}
            height={192}
            className="h-full w-full object-contain p-4"
          />
        ) : (
          <span className="font-mono text-xs text-muted-foreground">NO IMAGE</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-2">
        <span className="font-mono text-sm font-semibold text-foreground group-hover:text-primary">
          {name}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {count} {count === 1 ? noun : `${noun}s`}
        </span>
      </div>
    </Link>
  );
}
