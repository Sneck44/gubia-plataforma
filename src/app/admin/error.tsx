"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return <main className="p-8"><h1 className="text-2xl font-semibold">No pudimos cargar esta sección</h1><p className="my-4">No se han sustituido los datos por cifras estimadas. Intenta nuevamente.</p><button onClick={reset} className="rounded-lg bg-[var(--gubia)] px-5 py-3 text-white">Volver a intentar</button></main>;
}
