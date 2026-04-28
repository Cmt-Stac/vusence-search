import { mockTenders } from "@/data/mock-tenders";
import { loadRemoteTenders } from "@/lib/remote-tenders";
import { calculateScore, detectCategory } from "@/lib/scoring";
import type { RawTender, Tender } from "@/types/tender";
import { NextResponse } from "next/server";

function withComputedFields(rawTenders: RawTender[]): Tender[] {
  return rawTenders.map((tender) => {
    const score = calculateScore({
      title: tender.title,
      description: tender.description,
      keywords: tender.keywords,
    });

    const category = detectCategory({
      title: tender.title,
      description: tender.description,
      keywords: tender.keywords,
    });

    return {
      ...tender,
      category,
      score,
    };
  });
}

type SourceMeta = {
  mode: "mock" | "remote";
  note: string;
};

async function getSourceTenders(): Promise<{ data: RawTender[]; meta: SourceMeta }> {
  const sourceMode = process.env.TENDERS_SOURCE_MODE?.trim().toLowerCase();

  if (sourceMode === "remote") {
    try {
      const remoteTenders = await loadRemoteTenders();
      return {
        data: remoteTenders,
        meta: {
          mode: "remote",
          note: "Source reelle activee.",
        },
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Erreur inconnue";
      return {
        data: mockTenders,
        meta: {
          mode: "mock",
          note: `Fallback mock active (${reason}).`,
        },
      };
    }
  }

  return {
    data: mockTenders,
    meta: {
      mode: "mock",
      note: "Source mock (simulation).",
    },
  };
}

function shuffleTenders(tenders: Tender[]): Tender[] {
  const copy = [...tenders];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function applyDistanceVariation(tenders: Tender[]): Tender[] {
  return tenders.map((tender) => {
    const offset = Math.floor(Math.random() * 9) - 4;
    return {
      ...tender,
      distanceKm: Math.max(3, tender.distanceKm + offset),
    };
  });
}

export async function GET() {
  const source = await getSourceTenders();
  const tenders = applyDistanceVariation(
    shuffleTenders(withComputedFields(source.data)),
  );

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    total: tenders.length,
    data: tenders,
    source: source.meta,
  });
}
