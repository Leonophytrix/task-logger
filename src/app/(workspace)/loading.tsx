export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading workspace" className="space-y-6">
      <div className="h-12 w-2/3 rounded-xl bg-border motion-safe:animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-40 rounded-2xl bg-border motion-safe:animate-pulse"
          />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-border motion-safe:animate-pulse" />
    </div>
  );
}
