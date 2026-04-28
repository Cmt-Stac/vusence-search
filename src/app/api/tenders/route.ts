import { mockTenders } from "@/data/mock-tenders";
import { calculateScore, detectCategory } from "@/lib/scoring";
import type { Tender } from "@/types/tender";
import { NextResponse } from "next/server";

function withComputedFields(): Tender[] {
  return mockTenders.map((tender) => {
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
  const tenders = applyDistanceVariation(shuffleTenders(withComputedFields()));

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    total: tenders.length,
    data: tenders,
  });
}
