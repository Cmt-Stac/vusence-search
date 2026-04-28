import type { PersistedTenderStatus, UserTenderState } from "@/types/state";
import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const stateFilePath = path.join(process.cwd(), "src", "data", "user-state.json");

function createDefaultState(): UserTenderState {
  return {
    updatedAt: new Date(0).toISOString(),
    statusById: {},
  };
}

async function readState(): Promise<UserTenderState> {
  try {
    const raw = await readFile(stateFilePath, "utf-8");
    const parsed = JSON.parse(raw) as UserTenderState;

    if (!parsed || typeof parsed !== "object") {
      return createDefaultState();
    }

    return {
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
      statusById: parsed.statusById ?? {},
    };
  } catch {
    return createDefaultState();
  }
}

async function writeState(next: UserTenderState): Promise<void> {
  await mkdir(path.dirname(stateFilePath), { recursive: true });
  await writeFile(stateFilePath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
}

export async function GET() {
  const state = await readState();

  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    id?: string;
    status?: PersistedTenderStatus | null;
  };

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json(
      { message: "Champ id invalide." },
      { status: 400 },
    );
  }

  const currentState = await readState();
  const nextMap = { ...currentState.statusById };

  if (body.status === "favorite" || body.status === "ignored") {
    nextMap[body.id] = body.status;
  } else {
    delete nextMap[body.id];
  }

  const nextState: UserTenderState = {
    updatedAt: new Date().toISOString(),
    statusById: nextMap,
  };

  await writeState(nextState);

  return NextResponse.json(nextState);
}
