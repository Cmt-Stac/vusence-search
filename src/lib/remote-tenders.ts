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
  // Use data.gouv.fr CKAN API for paginated results (more efficient than 98MB static file)
  const baseUrl =
    "https://data.gouv.fr/api/2/datasets/donnees-essentielles-des-marches-publics/resources";

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  try {
    // Get resources list to find the CSV/JSON endpoint
    const resourcesResponse = await fetch(baseUrl, { headers, cache: "no-store" });
    if (!resourcesResponse.ok) {
      throw new Error("Cannot fetch resource list");
    }

    const resourcesData = (await resourcesResponse.json()) as Record<
      string,
      unknown
    >;
    const resources = (resourcesData.data as unknown[]) || [];

    // Find the most recent resource
    const resource = resources.find(
      (r) =>
        typeof r === "object" &&
        r !== null &&
        (String((r as Record<string, unknown>).title || "").includes("2024") ||
          String((r as Record<string, unknown>).title || "").includes("2023"))
    ) as Record<string, unknown> | undefined;

    if (!resource) {
      throw new Error("No suitable resource found");
    }

    const url = String(resource.url || "");
    if (!url) {
      throw new Error("No URL in resource");
    }

    // For CKAN API, fetch the data
    const dataResponse = await fetch(url, { headers, cache: "no-store" });
    if (!dataResponse.ok) {
      throw new Error(`Data fetch failed (${dataResponse.status})`);
    }

    const contentType = dataResponse.headers.get("content-type") || "";

    let records: ProcurementRecord[] = [];

    if (contentType.includes("json")) {
      const payload = (await dataResponse.json()) as unknown;

      if (Array.isArray(payload)) {
        records = payload;
      } else if (payload && typeof payload === "object") {
        const record = payload as Record<string, unknown>;
        if (record.records && Array.isArray(record.records)) {
          records = record.records as ProcurementRecord[];
        } else if (record.data && Array.isArray(record.data)) {
          records = record.data as ProcurementRecord[];
        } else if (record.results && Array.isArray(record.results)) {
          records = record.results as ProcurementRecord[];
        }
      }
    } else if (contentType.includes("csv") || url.endsWith(".csv")) {
      // For CSV: parse first 50 lines
      const text = await dataResponse.text();
      const lines = text.split("\n");
      const headers = lines[0].split(",");

      records = lines
        .slice(1, 100)
        .filter((line) => line.trim())
        .map((line) => {
          const values = line.split(",");
          const record: Record<string, unknown> = {};
          headers.forEach((header, idx) => {
            record[header.trim()] = values[idx]?.trim() || "";
          });
          return record;
        });
    } else {
      // Fallback: assume JSON array
      const payload = (await dataResponse.json()) as unknown;
      if (Array.isArray(payload)) {
        records = payload;
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
  } catch (err) {
    // Fallback to direct URL if CKAN API fails
    const fallbackUrl = process.env.TENDERS_REMOTE_URL?.trim();
    if (fallbackUrl && fallbackUrl !== baseUrl) {
      const fallbackResponse = await fetch(fallbackUrl, {
        headers,
        cache: "no-store",
      });

      if (fallbackResponse.ok) {
        const payload = (await fallbackResponse.json()) as unknown;
        let records: ProcurementRecord[] = [];

        if (Array.isArray(payload)) {
          records = payload;
        } else if (payload && typeof payload === "object") {
          const record = payload as Record<string, unknown>;
          if (record.records && Array.isArray(record.records)) {
            records = record.records as ProcurementRecord[];
          } else if (record.data && Array.isArray(record.data)) {
            records = record.data as ProcurementRecord[];
          }
        }

        const tenders = records
          .slice(0, 100)
          .map((record, index) => mapMarketToTender(record, index))
          .filter((row): row is RawTender => row !== null);

        if (tenders.length > 0) {
          return tenders.slice(0, 50);
        }
      }
    }

    throw new Error(
      `Impossible de charger les appels d offres: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}