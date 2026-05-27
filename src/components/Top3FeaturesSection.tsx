import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const PROVIDER_LOGO = "https://cdn.cs2c.app/images/providers";

type Feature = {
  tag: string;
  title: string;
  blurb: string;
  cta: string;
  href: string;
  visual: React.ReactNode;
};

export function Top3FeaturesSection() {
  const features: Feature[] = [
    {
      tag: "PRICES + BUY ORDERS",
      title: "BUFF163, YOUPIN +30 MORE",
      blurb:
        "Live ask, bid, and recent sales across every market that moves CS2 prices.",
      cta: "VIEW MARKETS",
      href: "/marketplaces",
      visual: <PrimaryMarketsVisual />,
    },
    {
      tag: "DOPPLER PHASES",
      title: "EVERY PHASE PRICED",
      blurb:
        "Ruby, Sapphire, Black Pearl, Emerald, Phases 1–4 — never bundled, never guessed.",
      cta: "EXPLORE DOPPLERS",
      href: "/search?q=doppler",
      visual: <DopplerPhasesVisual />,
    },
    {
      tag: "MULTI-YEAR HISTORY",
      title: "REAL OHLCV CANDLES",
      blurb:
        "5-minute to daily candlesticks. Two years of depth across every release and patch.",
      cta: "CANDLESTICK API",
      href: "/cs2-candlestick-api",
      visual: <OhlcCandlesVisual />,
    },
  ];

  return (
    <section className="border-t-2 border-border py-20 md:py-24">
      <div className="container">
        <div className="mb-3 font-mono text-xs tracking-widest text-primary">
          // THREE THINGS WE DO BEST
        </div>
        <h2 className="display-heading mb-10 max-w-3xl text-3xl font-black tracking-tighter md:text-5xl lg:text-6xl">
          THE DATA YOU CAN&apos;T{" "}
          <span className="text-gradient-brand">GET ANYWHERE ELSE</span>.
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border border-2 border-border">
          {features.map((f) => (
            <article
              key={f.title}
              className="flex flex-col gap-5 bg-card p-7"
            >
              <span className="inline-flex w-fit border border-primary/40 px-2 py-1 font-mono text-xs font-bold tracking-widest text-primary">
                {f.tag}
              </span>
              <div className="relative h-44 overflow-hidden border-2 border-border bg-background">
                {f.visual}
              </div>
              <div>
                <h3 className="font-sans text-xl font-black leading-tight tracking-tight text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2.5 font-mono text-[13px] leading-relaxed text-muted-foreground">
                  {f.blurb}
                </p>
              </div>
              <div className="mt-auto">
                <Link
                  href={f.href}
                  className="inline-flex items-center gap-2 border-2 border-border px-4 py-2 font-mono text-xs font-bold tracking-wider text-foreground brutalist-hover hover:border-primary hover:text-primary transition-colors"
                >
                  {f.cta}
                  <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────
// Visual 1 — BUFF163 + Youpin headline + market satellites
// ─────────────────────────────────────────────────────────
function PrimaryMarketsVisual() {
  const headliners = [
    { key: "buff163", label: "BUFF163" },
    { key: "youpin", label: "YOUPIN898" },
  ];
  const satellites = ["csfloat", "skinport", "steam", "bitskins", "dmarket"];

  return (
    <div className="absolute inset-0 flex flex-col justify-between p-3.5">
      <div className="flex items-center justify-center gap-4 py-1.5">
        <Headliner logoKey={headliners[0].key} label={headliners[0].label} />
        <span className="font-sans text-2xl font-black text-muted-foreground">+</span>
        <Headliner logoKey={headliners[1].key} label={headliners[1].label} />
      </div>
      <div className="flex items-center justify-center gap-2.5 border-t border-border pt-3">
        <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          + 30 more markets
        </span>
        <div className="flex gap-1">
          {satellites.map((s) => (
            <div
              key={s}
              className="flex h-6 w-6 items-center justify-center overflow-hidden border border-border bg-card p-0.5"
            >
              <Image
                src={`${PROVIDER_LOGO}/${s}.png`}
                alt={s}
                width={16}
                height={16}
                className="h-auto w-auto object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Visual 2 — Karambit silhouettes in Doppler phase colors
// ─────────────────────────────────────────────────────────
const KARAMBIT_IMG_BASE =
  "https://cdn.cs2c.app/images/econ/default_generated";

function DopplerPhasesVisual() {
  const phases = [
    {
      color: "hsl(0 80% 55%)",
      label: "RUBY",
      price: "$3,420",
      image: `${KARAMBIT_IMG_BASE}/weapon_knife_karambit_am_ruby_marbleized_light_png.png`,
    },
    {
      color: "hsl(217 90% 55%)",
      label: "SAPPHIRE",
      price: "$5,180",
      image: `${KARAMBIT_IMG_BASE}/weapon_knife_karambit_am_sapphire_marbleized_light_png.png`,
    },
    {
      color: "hsl(145 70% 45%)",
      label: "EMERALD",
      price: "$8,720",
      image: `${KARAMBIT_IMG_BASE}/weapon_knife_karambit_am_emerald_marbleized_light_png.png`,
    },
    {
      color: "hsl(220 30% 22%)",
      label: "BLK PRL",
      price: "$2,950",
      image: `${KARAMBIT_IMG_BASE}/weapon_knife_karambit_am_blackpearl_marbleized_light_png.png`,
    },
  ];

  return (
    <div className="absolute inset-0 flex flex-col items-stretch justify-center gap-2 p-3.5">
      <div className="flex items-end justify-around">
        {phases.map((p) => (
          <Karambit key={p.label} image={p.image} label={p.label} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-px border border-border bg-border">
        {phases.map((p) => (
          <div
            key={p.label}
            className="bg-card px-1.5 py-1 text-center"
          >
            <div className="font-mono text-xs font-bold" style={{ color: p.color }}>
              {p.price}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Headliner({ logoKey, label }: { logoKey: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden border-2 border-border bg-secondary p-1.5">
        <Image
          src={`${PROVIDER_LOGO}/${logoKey}.png`}
          alt={label}
          width={44}
          height={44}
          className="h-auto w-auto object-contain"
        />
      </div>
      <span className="font-mono text-xs font-bold tracking-widest text-foreground">
        {label}
      </span>
    </div>
  );
}

function Karambit({ image, label }: { image: string; label: string }) {
  return (
    <Image
      src={image}
      alt={`Karambit ${label}`}
      width={96}
      height={72}
      className="h-16 w-auto object-contain"
    />
  );
}

// ─────────────────────────────────────────────────────────
// Visual 3 — 28-candle OHLC across 24 months
// ─────────────────────────────────────────────────────────
function OhlcCandlesVisual() {
  const N = 28;
  const W = 240;
  const H = 150;
  const top = 16;
  const bottom = H - 22;
  const range = bottom - top;
  const cw = (W - 20) / N;
  const y = (v: number) => top + v * range;

  const candles = Array.from({ length: N }, (_, i) => {
    const t = i / (N - 1);
    const mid = 0.6 - t * 0.42;
    const wave = Math.sin(i * 0.83) * 0.04;
    const o = mid + wave;
    const c = mid + wave + Math.sin(i * 2.1) * 0.07;
    const high = Math.min(o, c) - 0.045 - Math.abs(Math.sin(i * 1.3)) * 0.02;
    const low = Math.max(o, c) + 0.045 + Math.abs(Math.cos(i * 0.7)) * 0.02;
    return { o, c, high, low, up: c < o };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" aria-hidden>
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1="10"
          y1={y(g)}
          x2={W - 10}
          y2={y(g)}
          stroke="hsl(217 40% 20% / 0.6)"
          strokeDasharray="2 4"
        />
      ))}
      <line
        x1={W / 3 + 10}
        y1={top - 2}
        x2={W / 3 + 10}
        y2={bottom + 2}
        stroke="hsl(217 40% 20%)"
        strokeDasharray="2 3"
      />
      <line
        x1={(2 * W) / 3 + 10}
        y1={top - 2}
        x2={(2 * W) / 3 + 10}
        y2={bottom + 2}
        stroke="hsl(217 40% 20%)"
        strokeDasharray="2 3"
      />
      <text x="14" y={H - 6} fill="hsl(217 15% 55%)" fontFamily="ui-monospace, monospace" fontSize="8" letterSpacing="1.5">
        2024
      </text>
      <text
        x={W / 3 + 18}
        y={H - 6}
        fill="hsl(217 15% 55%)"
        fontFamily="ui-monospace, monospace"
        fontSize="8"
        letterSpacing="1.5"
      >
        2025
      </text>
      <text
        x={(2 * W) / 3 + 18}
        y={H - 6}
        fill="hsl(217 15% 55%)"
        fontFamily="ui-monospace, monospace"
        fontSize="8"
        letterSpacing="1.5"
      >
        2026
      </text>
      {candles.map((c, i) => {
        const x = 14 + i * cw;
        const cx = x + cw / 2 - 1;
        const color = c.up ? "hsl(145 70% 45%)" : "hsl(0 70% 55%)";
        const bodyTop = y(Math.min(c.o, c.c));
        const bodyH = Math.max(2, Math.abs(y(c.c) - y(c.o)));
        return (
          <g key={i}>
            <line
              x1={cx + 0.5}
              y1={y(c.high)}
              x2={cx + 0.5}
              y2={y(c.low)}
              stroke={color}
              strokeWidth="1"
            />
            <rect x={x} y={bodyTop} width={cw - 2} height={bodyH} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}
