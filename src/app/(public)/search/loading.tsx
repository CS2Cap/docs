function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-sm bg-secondary/70 ${className}`.trim()} />;
}

export default function Loading() {
  return (
    <>
      <section className="border-b-2 border-border bg-grid py-12">
        <div className="container">
          <SkeletonLine className="mb-4 h-3 w-20" />
          <SkeletonLine className="mb-4 h-12 w-full max-w-xl" />
          <SkeletonLine className="mb-2 h-4 w-full max-w-2xl" />
          <SkeletonLine className="mb-6 h-4 w-full max-w-xl" />

          <div className="mb-6 grid gap-2 md:grid-cols-[1fr_220px_auto]">
            <SkeletonLine className="h-12 w-full" />
            <SkeletonLine className="h-12 w-full" />
            <SkeletonLine className="h-12 w-full md:w-32" />
          </div>

          <div className="flex flex-wrap gap-px bg-border">
            {Array.from({ length: 7 }).map((_, index) => (
              <SkeletonLine key={index} className="h-8 w-20 bg-card" />
            ))}
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="container">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <SkeletonLine className="h-3 w-24" />
              <SkeletonLine className="mt-2 h-3 w-32" />
            </div>
          </div>

          <div className="hidden grid-cols-[minmax(0,1.5fr)_140px_110px_120px] gap-4 border-b-2 border-border px-4 py-2 md:grid">
            <SkeletonLine className="h-3 w-16" />
            <SkeletonLine className="h-3 w-12 justify-self-end" />
            <SkeletonLine className="h-3 w-10 justify-self-end" />
            <SkeletonLine className="h-3 w-14 justify-self-end" />
          </div>

          <div>
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="border-b border-border px-4 py-4"
              >
                <div className="md:grid md:grid-cols-[minmax(0,1.5fr)_140px_110px_120px] md:items-center md:gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <SkeletonLine className="h-12 w-12 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <SkeletonLine className="h-4 w-full max-w-md" />
                      <SkeletonLine className="mt-2 h-3 w-40" />
                    </div>
                    <SkeletonLine className="h-4 w-16 md:hidden" />
                  </div>

                  <SkeletonLine className="mt-3 hidden h-4 w-16 justify-self-end md:block md:mt-0" />
                  <SkeletonLine className="mt-3 hidden h-4 w-12 justify-self-end md:block md:mt-0" />
                  <SkeletonLine className="mt-3 hidden h-4 w-14 justify-self-end md:block md:mt-0" />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-4 md:hidden">
                  <div>
                    <SkeletonLine className="h-3 w-10" />
                    <SkeletonLine className="mt-2 h-4 w-14" />
                  </div>
                  <div className="text-right">
                    <SkeletonLine className="ml-auto h-3 w-12" />
                    <SkeletonLine className="mt-2 ml-auto h-4 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <SkeletonLine className="h-9 w-16" />
            <SkeletonLine className="h-3 w-20" />
            <SkeletonLine className="h-9 w-16" />
          </div>
        </div>
      </section>
    </>
  );
}
