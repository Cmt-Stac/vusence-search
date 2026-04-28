export type PersistedTenderStatus = "favorite" | "ignored";

export type UserTenderState = {
  updatedAt: string;
  statusById: Record<string, PersistedTenderStatus>;
};
