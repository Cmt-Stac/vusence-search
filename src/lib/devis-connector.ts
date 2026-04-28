import type { TenderCategory } from "@/types/tender";

type DevisPayload = {
  tenderId: string;
  title: string;
  category: TenderCategory;
  city: string;
  score: number;
  budget?: number;
};

type DevisSendResult = {
  ok: boolean;
  message: string;
};

type DevisConnector = {
  mode: "mock" | "stub";
  sendOpportunity: (payload: DevisPayload) => Promise<DevisSendResult>;
};

const mockConnector: DevisConnector = {
  mode: "mock",
  async sendOpportunity(payload) {
    void payload;
    return {
      ok: true,
      message: "Fonction a venir",
    };
  },
};

const futureStubConnector: DevisConnector = {
  mode: "stub",
  async sendOpportunity(payload) {
    void payload;
    return {
      ok: true,
      message:
        "Connecteur V2 prepare. Aucune connexion externe active pour le moment.",
    };
  },
};

export function getDevisConnector(): DevisConnector {
  const mode = process.env.DEVIS_CONNECTOR_MODE?.trim().toLowerCase();

  if (mode === "stub") {
    return futureStubConnector;
  }

  return mockConnector;
}

export type { DevisPayload, DevisSendResult };
