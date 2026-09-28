import { notFound } from "next/navigation";
import { catalogs } from "@/lib/catalogs";
import { CatalogPage } from "@/components/catalog-page";
import { OperationsPage } from "@/components/operations-page";
import { IntelligencePage } from "@/components/intelligence-page";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { section } = await params;
  const query = await searchParams;
  if (Object.hasOwn(catalogs, section))
    return <CatalogPage section={section} query={query} />;
  if (["agenda", "citas", "pacientes"].includes(section))
    return <OperationsPage section={section} query={query} />;
  if (["conversiones", "no-convertidos", "reportes"].includes(section))
    return <IntelligencePage section={section} query={query} />;
  notFound();
}
