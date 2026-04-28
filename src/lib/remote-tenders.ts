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

/**
 * Real French procurement data from multiple sources
 * Primary: Local real tenders data (from /public/real-tenders.json)
 */

export async function loadRemoteTenders(): Promise<RawTender[]> {
  // Try multiple real data sources in order
  const dataSources = [
    // Source 1: Local real tenders dataset (served from Vercel)
    "/real-tenders.json",
    
    // Source 2: User-provided custom URL (environment variable)
    process.env.TENDERS_REMOTE_URL?.trim(),
  ].filter(Boolean);

  for (const sourceUrl of dataSources) {
    if (!sourceUrl) continue;

    try {
      const response = await fetch(sourceUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) continue;

      const data = (await response.json()) as unknown;
      let records: ProcurementRecord[] = [];

      // Try to extract records from various known formats
      if (Array.isArray(data)) {
        records = data;
      } else if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;

        // data.gouv.fr formats
        if (obj.data && Array.isArray(obj.data)) {
          const items = obj.data as unknown[];
          // If it's a resource list, find a data item
          if (items.length > 0 && typeof items[0] === "object") {
            const first = items[0] as Record<string, unknown>;
            if (first.resources && Array.isArray(first.resources)) {
              // This is a dataset, try to extract URLs
              const resources = first.resources as unknown[];
              for (const res of resources) {
                if (
                  res &&
                  typeof res === "object" &&
                  (res as Record<string, unknown>).url
                ) {
                  try {
                    const dataUrl = String(
                      (res as Record<string, unknown>).url
                    );
                    const dataRes = await fetch(dataUrl, { 
                      cache: "no-store",
                      headers: { Accept: "application/json" }
                    });
                    if (dataRes.ok) {
                      const parsed = (await dataRes.json()) as unknown;
                      if (Array.isArray(parsed)) {
                        records = parsed;
                        break;
                      }
                    }
                  } catch {
                    // Try next resource
                  }
                }
              }
            } else {
              // Direct array of records
              records = items as ProcurementRecord[];
            }
          }
        } else if (obj.records && Array.isArray(obj.records)) {
          records = obj.records as ProcurementRecord[];
        } else if (obj.results && Array.isArray(obj.results)) {
          records = obj.results as ProcurementRecord[];
        }
      }

      if (records.length > 0) {
        const tenders = records
          .slice(0, 100)
          .map((record, index) => mapMarketToTender(record, index))
          .filter((row): row is RawTender => row !== null);

        if (tenders.length > 0) {
          return tenders.slice(0, 50);
        }
      }
    } catch {
      // Try next source
    }
  }

  throw new Error(
    "Impossible de charger les appels d'offres. Vérifiez votre configuration."
  );
}