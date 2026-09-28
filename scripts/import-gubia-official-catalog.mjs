import { readFileSync, writeFileSync } from "node:fs";

const [, , htmlPath, jsonPath, migrationPath] = process.argv;

if (!htmlPath || !jsonPath || !migrationPath) {
  console.error("Uso: node scripts/import-gubia-official-catalog.mjs <html> <json> <migration.sql>");
  process.exit(1);
}

const html = readFileSync(htmlPath, "utf8");

function decodeHtml(value = "") {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, name) => named[name.toLowerCase()] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 110);
}

const names = new Map();
const preparations = new Map();

for (const match of html.matchAll(/id="gv_Estudios_Label11_(\d+)"[^>]*>([\s\S]*?)<\/span>/g)) {
  names.set(Number(match[1]), decodeHtml(match[2]));
}

for (const match of html.matchAll(/id="gv_Estudios_Label12_(\d+)"[^>]*>([\s\S]*?)<\/span>/g)) {
  preparations.set(Number(match[1]), decodeHtml(match[2]));
}

const byName = new Map();
for (const [index, name] of [...names.entries()].sort(([a], [b]) => a - b)) {
  if (!name) continue;
  const preparation = preparations.get(index) || "Sin indicaciones publicadas";
  const current = byName.get(name);
  if (!current || preparation.length > current.preparation.length) {
    byName.set(name, { name, preparation });
  }
}

const usedSlugs = new Map();
const studies = [...byName.values()].map((study) => {
  const base = slugify(study.name) || "estudio";
  const count = (usedSlugs.get(base) || 0) + 1;
  usedSlugs.set(base, count);
  return { ...study, slug: count === 1 ? base : `${base}-${count}` };
});

if (studies.length < 650) {
  throw new Error(`El catálogo parece incompleto: solo se encontraron ${studies.length} estudios únicos.`);
}

const generatedAt = new Date().toISOString();
const document = {
  source: "https://www.gubia.mx/estudios.aspx",
  checked_at: generatedAt,
  published_rows: names.size,
  unique_studies: studies.length,
  limitations: [
    "El sitio público no publica precios.",
    "El sitio público no publica duración por estudio.",
    "El sitio público no confirma disponibilidad por sucursal.",
  ],
  studies,
};

writeFileSync(jsonPath, `${JSON.stringify(document, null, 2)}\n`);

const payload = JSON.stringify(studies);
const sql = `-- Catálogo público consultado en ${generatedAt}.
-- La fuente no publica precios, duración ni disponibilidad por sucursal.
-- Por seguridad comercial, los registros se importan inactivos y no habilitan reservas.

with official_catalog as (
  select *
  from jsonb_to_recordset($gubia_catalog$${payload}$gubia_catalog$::jsonb)
    as item(name text, preparation text, slug text)
)
insert into public.services (
  name,
  slug,
  category,
  description,
  price,
  preparation,
  duration_minutes,
  active
)
select
  name,
  slug,
  'Catálogo oficial GUBIA',
  'Fuente pública: https://www.gubia.mx/estudios.aspx. Precio, duración y disponibilidad por sucursal requieren validación interna.',
  null,
  preparation,
  30,
  false
from official_catalog
on conflict (slug) do update
set
  name = excluded.name,
  preparation = excluded.preparation,
  updated_at = now();
`;

writeFileSync(migrationPath, sql);
console.log(JSON.stringify({ publishedRows: names.size, uniqueStudies: studies.length, jsonPath, migrationPath }));
