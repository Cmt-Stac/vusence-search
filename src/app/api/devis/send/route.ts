import {
  getDevisConnector,
  type DevisPayload,
  type DevisSendResult,
} from "@/lib/devis-connector";
import { NextResponse } from "next/server";

function isPayload(payload: unknown): payload is DevisPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Record<string, unknown>;

  return (
    typeof candidate.tenderId === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.category === "string" &&
    typeof candidate.city === "string" &&
    typeof candidate.score === "number"
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as unknown;

  if (!isPayload(body)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Payload invalide.",
      } satisfies DevisSendResult,
      { status: 400 },
    );
  }

  const connector = getDevisConnector();
  const result = await connector.sendOpportunity(body);

  return NextResponse.json({
    ...result,
    mode: connector.mode,
  });
}
