function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-sm bg-secondary/70 ${className}`.trim()} />;
}

export default function Loading() {
  return (
    <section className="terminal-page border-b border-border py-4 md:py-5">
      <div className="container">
        <div className="mb-4 terminal-panel p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <SkeletonLine className="h-3 w-32" />
              <SkeletonLine className="mt-2 h-3 w-56" />
            </div>
            <SkeletonLine className="h-8 w-40" />
          </div>
          <SkeletonLine className="h-10 w-full" />
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="terminal-panel min-w-0 p-3">
            <div className="grid grid-cols-2 gap-2">
              <SkeletonLine className="h-14 w-full" />
              <SkeletonLine className="h-14 w-full" />
            </div>
            <SkeletonLine className="mt-3 h-20 w-full" />
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonLine key={index} className="mt-3 h-24 w-full" />
            ))}
          </aside>

          <div className="min-w-0">
            <div className="mb-3 terminal-panel p-3">
              <SkeletonLine className="h-3 w-28" />
              <SkeletonLine className="mt-2 h-3 w-44" />
            </div>

            <div className="hidden grid-cols-[minmax(240px,1.4fr)_88px_88px_78px_72px_72px_82px_52px] gap-3 border border-border bg-card/80 px-3 py-2 md:grid">
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonLine key={index} className="h-3 w-12" />
              ))}
            </div>

            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="border-x border-b border-border px-3 py-2.5">
                <div className="md:grid md:grid-cols-[minmax(240px,1.4fr)_88px_88px_78px_72px_72px_82px_52px] md:items-center md:gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <SkeletonLine className="h-11 w-11 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <SkeletonLine className="h-4 w-full max-w-md" />
                      <SkeletonLine className="mt-2 h-3 w-40" />
                    </div>
                    <SkeletonLine className="h-4 w-16 md:hidden" />
                  </div>

                  {Array.from({ length: 7 }).map((_, metricIndex) => (
                    <SkeletonLine
                      key={metricIndex}
                      className="mt-3 hidden h-4 w-14 justify-self-end md:block md:mt-0"
                    />
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-4 flex items-center justify-between terminal-panel p-3">
              <SkeletonLine className="h-3 w-44" />
              <SkeletonLine className="h-8 w-64" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
