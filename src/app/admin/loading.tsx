export default function Loading() {
  return (
    <main className="p-5 md:p-9" aria-busy="true">
      <p role="status" className="text-sm text-slate-600">Cargando tu espacio de trabajo…</p>
      <div aria-hidden="true" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="card p-6">
            <div className="h-8 w-8 rounded-lg bg-[#edf2e9]" />
            <div className="mt-5 h-6 w-16 rounded bg-[#edf2e9]" />
            <div className="mt-3 h-3 w-3/4 rounded bg-[#edf2e9]" />
          </div>
        ))}
      </div>
    </main>
  );
}
