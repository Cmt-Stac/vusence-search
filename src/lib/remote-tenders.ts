import type { RawTender } from "@/types/tender";

/**
 * Loader for French public procurement data from data.gouv.fr
 * Source: Donnees essentielles des marches publics
 */

type ProcurementRecord = Record<string, unknown>;

function extractString(obj: unknown, paths: string[]): string {
  if (!obj || typeof obj !== "object") return "";
  const record = obj as Record<string, unknown>;
  for (const path of paths) {
    if (path.includes(".")) {
      const parts = path.split(".");
      let current: unknown = record;
      for (const part of parts) {
        if (current && typeof current === "object") {
          current = (current as Record<string, unknown>)[part];
        } else {
          current = null;
          break;
        }
      }
      if (typeof current === "string" && current.trim()) {
        return current.trim();
      }
    } else if (typeof record[path] === "string" && String(record[path]).trim()) {
      return String(record[path]).trim();
    }
  }
  return "";
}

function extractNumber(obj: unknown, paths: string[]): number | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const record = obj as Record<string, unknown>;
  for (const path of paths) {
    const value = record[path];
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const num = Number(value.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(num)) {
        return num;
      }
    }
  }
  return undefined;
}

function extractDate(obj: unknown, paths: string[]): string {
  if (!obj || typeof obj !== "object") return new Date().toISOString().split("T")[0];
  const record = obj as Record<string, unknown>;
  for (const path of paths) {
    const value = record[path];
    if (typeof value === "string") {
      try {
        const d = new Date(value);
        if (!Number.isNaN(d.getTime())) {
          return d.toISOString().split("T")[0];
        }
      } catch {
        // continue
      }
    }
  }
  return new Date().toISOString().split("T")[0];
}

function mapMarketToTender(record: ProcurementRecord, index: number): RawTender | null {
  const id = extractString(record, ["id", "uid"]);
  const title = extractString(record, ["objet"]);
  const city = extractString(record, [
    "lieuExecution.nom",
    "lieuExecution",
    "acheteur.nom",
  ]);
  const buyer = extractString(record, ["acheteur.nom"]);
  const procedure = extractString(record, ["procedure", "nature"]);

  if (!id || !title || !city) {
    return null;
  }

  const budget = extractNumber(record, ["montant"]);
  const date = extractDate(record, ["dateNotification", "datePublicationDonnees"]);

  const description = [
    `Nature: ${extractString(record, ["nature"])}`,
    `Procedure: ${procedure}`,
    title.length > 200 ? `${title.substring(0, 200)}...` : title,
  ]
    .filter(Boolean)
    .join(" | ");

  const keywords = [
    extractString(record, ["nature"]),
    extractString(record, ["procedure"]),
    buyer,
  ]
    .filter(Boolean)
    .map((kw) => kw.toLowerCase());

  const distanceKm = Math.floor(Math.random() * 80) + 5;

  return {
    id: id || `MARKET-${index}`,
    title,
    description,
    city,
    budget,
    publicationDate: date,
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

  let records: ProcurementRecord[] = [];

  if (Array.isArray(payload)) {
    records = payload;
  } else if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (record.records && Array.isArray(record.records)) {
      records = record.records as ProcurementRecord[];
    } else if (record.data && Array.isArray(record.data)) {
      records = record.data as ProcurementRecord[];
    } else if (record.items && Array.isArray(record.items)) {
      records = record.items as ProcurementRecord[];
    }
  }

  const tenders = records
    .slice(0, 100)
    .map((record, index) => mapMarketToTender(record, index))
    .filter((row): row is RawTender => row !== null);

  if (tenders.length === 0) {
    throw new Error("Aucun appel d offres valide dans la source distante.");
  }

  return tenders.slice(0, 50);
}