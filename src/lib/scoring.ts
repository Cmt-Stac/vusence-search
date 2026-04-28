import type { TenderCategory } from "@/types/tender";

export const CATEGORY_KEYWORDS: Record<TenderCategory, string[]> = {
  "BTP / BIM / SCAN 3D": [
    "bim",
    "scan 3d",
    "nuage de points",
    "releve architectural",
    "modelisation 3d",
    "patrimoine",
    "urbanisme",
    "laser scanner",
  ],
  "IMMOBILIER / VISITE VIRTUELLE": [
    "agence immobiliere",
    "visite virtuelle",
    "visite 3d",
    "matterport",
    "immobilier",
    "villa",
    "location saisonniere",
    "airbnb",
  ],
};

export const KEYWORD_WEIGHTS: Record<string, number> = {
  "visite virtuelle": 5,
  bim: 5,
  "scan 3d": 5,
  "agence immobiliere": 3,
  luxe: 4,
  villa: 4,
  "nuage de points": 4,
  "laser scanner": 4,
  "releve architectural": 3,
  "modelisation 3d": 3,
  urbanisme: 2,
  patrimoine: 2,
  immobilier: 2,
  matterport: 3,
  airbnb: 2,
  "location saisonniere": 2,
  "visite 3d": 3,
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function calculateScore(input: {
  title: string;
  description: string;
  keywords: string[];
}): number {
  const corpus = normalizeText(
    `${input.title} ${input.description} ${input.keywords.join(" ")}`,
  );

  let score = 0;

  for (const [keyword, weight] of Object.entries(KEYWORD_WEIGHTS)) {
    if (corpus.includes(keyword)) {
      score += weight;
    }
  }

  return score;
}

export function detectCategory(input: {
  title: string;
  description: string;
  keywords: string[];
}): TenderCategory {
  const corpus = normalizeText(
    `${input.title} ${input.description} ${input.keywords.join(" ")}`,
  );

  const btpMatches = CATEGORY_KEYWORDS["BTP / BIM / SCAN 3D"].reduce(
    (count, keyword) => count + Number(corpus.includes(keyword)),
    0,
  );

  const realEstateMatches = CATEGORY_KEYWORDS[
    "IMMOBILIER / VISITE VIRTUELLE"
  ].reduce((count, keyword) => count + Number(corpus.includes(keyword)), 0);

  if (realEstateMatches > btpMatches) {
    return "IMMOBILIER / VISITE VIRTUELLE";
  }

  return "BTP / BIM / SCAN 3D";
}
