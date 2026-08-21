// Skeleton saat segmen dashboard sedang dimuat (§P2-15).

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Memuat halaman…</span>
      <div className="skeleton h-10 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28 w-full" />
        ))}
      </div>
      <div className="skeleton h-80 w-full" />
    </div>
  );
}
