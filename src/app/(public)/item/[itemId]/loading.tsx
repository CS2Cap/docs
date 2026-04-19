function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-sm bg-secondary/70 ${className}`.trim()} />;
}

export default function Loading() {
  return (
    <>
      <section className="border-b-2 border-border bg-secondary/20 py-3">
        <div className="container flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <SkeletonLine className="h-3 w-10" />
          <span>/</span>
          <SkeletonLine className="h-3 w-12" />
          <span>/</span>
          <SkeletonLine className="h-3 w-40" />
        </div>
      </section>

      <section className="py-6">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-4 xl:col-span-3">
              <div className="border-brutal bg-card p-4">
                <SkeletonLine className="h-5 w-20" />
                <SkeletonLine className="mt-4 aspect-square w-full" />
                <SkeletonLine className="mt-4 h-6 w-3/4" />
                <SkeletonLine className="mt-2 h-3 w-24" />
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index}>
                      <SkeletonLine className="h-3 w-16" />
                      <SkeletonLine className="mt-2 h-4 w-20" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <SkeletonLine className="h-10 flex-1" />
                  <SkeletonLine className="h-10 w-28" />
                </div>
              </div>

              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="border-brutal bg-card p-4">
                  <SkeletonLine className="h-3 w-24" />
                  <div className="mt-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, row) => (
                      <SkeletonLine key={row} className="h-3 w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-6 lg:col-span-8 xl:col-span-9">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="border-brutal bg-card">
                  <div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
                    <SkeletonLine className="h-3 w-24" />
                    <SkeletonLine className="h-3 w-16" />
                  </div>
                  <div className="space-y-3 px-4 py-4">
                    {Array.from({ length: 5 }).map((_, row) => (
                      <div key={row} className="grid gap-3 md:grid-cols-4">
                        <SkeletonLine className="h-3 w-24" />
                        <SkeletonLine className="h-3 w-14" />
                        <SkeletonLine className="h-3 w-16" />
                        <SkeletonLine className="h-3 w-20" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="border-brutal bg-card p-4">
                <SkeletonLine className="h-3 w-24" />
                <div className="mt-4 flex h-64 items-end gap-2">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <SkeletonLine
                      key={index}
                      className={`flex-1 ${
                        index % 3 === 0 ? "h-28" : index % 3 === 1 ? "h-40" : "h-20"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
