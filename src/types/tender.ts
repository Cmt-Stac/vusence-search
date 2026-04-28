export type TenderCategory = "BTP / BIM / SCAN 3D" | "IMMOBILIER / VISITE VIRTUELLE";

export type TenderStatus = "new" | "favorite" | "ignored";

export type Tender = {
  id: string;
  title: string;
  description: string;
  city: string;
  budget?: number;
  publicationDate: string;
  keywords: string[];
  distanceKm: number;
  category: TenderCategory;
  score: number;
};

export type RawTender = Omit<Tender, "score" | "category">;
