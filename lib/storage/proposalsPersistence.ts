import "server-only";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { Proposal } from "@/lib/mock/proposals";

const DATA_DIR = join(process.cwd(), "data");
export const PROPOSALS_FILE_PATH = join(DATA_DIR, "proposals.json");

export interface ProposalsPersistenceData {
  userCreated: Proposal[];
}

const DEFAULT_DATA: ProposalsPersistenceData = {
  userCreated: [],
};

/** Synchronous load for use in proposals store. */
export function loadProposalsFromFileSync(): ProposalsPersistenceData {
  try {
    if (!existsSync(PROPOSALS_FILE_PATH)) {
      return { ...DEFAULT_DATA };
    }
    const raw = readFileSync(PROPOSALS_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as ProposalsPersistenceData;
    if (parsed && Array.isArray(parsed.userCreated)) {
      return parsed;
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[proposalsPersistence] Load error:", err);
    }
  }
  return { ...DEFAULT_DATA };
}

/** Synchronous save for use in proposals store after create/update. */
export function saveProposalsToFileSync(data: ProposalsPersistenceData): void {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(PROPOSALS_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[proposalsPersistence] Save error:", err);
    throw err;
  }
}
