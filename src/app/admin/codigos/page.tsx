import { CatalogPage } from "@/components/catalog-page";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <CatalogPage section="codigos" query={await searchParams} />;
}
