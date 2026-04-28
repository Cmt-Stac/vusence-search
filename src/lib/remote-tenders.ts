import type { RawTender } from "@/types/tender";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as UnknownRecord;
}

function pickString(record: UnknownRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function pickNumber(record: UnknownRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function pickKeywords(record: UnknownRecord): string[] {
  const keys = ["keywords", "tags", "mots_cles", "motcles"];

  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (typeof value === "string") {
      return value
        .split(/[,;|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function toIsoDate(input: string | null): string {
  if (!input) {
    return new Date().toISOString().slice(0, 10);
  }

  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

function ensureArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = asRecord(payload);
  if (!record) {
    return [];
  }

  const candidate = record.data ?? record.items ?? record.results ?? record.value;
  return Array.isArray(candidate) ? candidate : [];
}

function mapToRawTender(input: unknown, index: number): RawTender | null {
  const record = asRecord(input);
  if (!record) {
    return null;
  }

  const id =
    pickString(record, ["id", "reference", "ref", "numero", "uid"]) ??
    `REMOTE-${index + 1}`;
  const title = pickString(record, ["title", "titre", "name", "objet"]);
  const description = pickString(record, [
    "description",
    "resume",
    "summary",
    "details",
  ]);
  const city = pickString(record, ["city", "ville", "location", "commune"]);

  if (!title || !description || !city) {
    return null;
  }

  const budget = pickNumber(record, [
    "budget",
    "amount",
    "montant",
    "estimatedValue",
  ]);
  const distanceKm = pickNumber(record, ["distanceKm", "distance"]) ?? 25;
  const publicationDate = toIsoDate(
    pickString(record, ["publicationDate", "date", "published_at", "publishedAt"]),
  );
  const keywords = pickKeywords(record);

  return {
    id,
    title,
    description,
    city,
    budget,
    publicationDate,
    keywords,
    distanceKm,
  };
}

export async function loadRemoteTenders(): Promise<RawTender[]> {
  const sourceUrl = process.env.TENDERS_REMOTE_URL?.trim();
  if (!sourceUrl) {
    throw new Error("TENDERS_REMOTE_URL est vide.");
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token = process.env.TENDERS_REMOTE_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(sourceUrl, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Source distante indisponible (${response.status}).`);
  }

  const payload = (await response.json()) as unknown;
  const rows = ensureArray(payload);

  const tenders = rows
    .map((row, index) => mapToRawTender(row, index))
    .filter((row): row is RawTender => row !== null);

  if (tenders.length === 0) {
    throw new Error("Aucun appel d offres valide dans la source distante.");
  }

  return tenders;
}
