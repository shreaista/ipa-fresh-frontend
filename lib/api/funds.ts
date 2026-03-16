/**
 * Shared client-side fund fetching for Funds page and New Proposal page.
 * Uses the same endpoint and tenant scope as the Funds page.
 */

const FUNDS_API_URL = "/api/tenant/funds";

export interface FundOption {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  status: string;
}

export interface FetchFundsResult {
  ok: boolean;
  funds?: FundOption[];
  error?: string;
}

export async function fetchFundsFromApi(): Promise<FetchFundsResult> {
  console.log("[fundsApi] Fetch started, endpoint:", FUNDS_API_URL);
  try {
    const res = await fetch(FUNDS_API_URL, { credentials: "include" });
    const data = await res.json();
    const rawFunds = data.data?.funds;
    const rawCount = Array.isArray(rawFunds) ? rawFunds.length : 0;
    console.log("[fundsApi] Response status:", res.status, "raw funds count:", rawCount);

    if (!data.ok || !Array.isArray(rawFunds)) {
      const errMsg = data.error || "Failed to load funds";
      console.warn("[fundsApi] Fetch failed, ok:", data.ok, "rawCount:", rawCount, "error:", errMsg);
      return { ok: false, error: errMsg };
    }

    console.log("[fundsApi] Funds loaded, count:", rawFunds.length);
    return { ok: true, funds: rawFunds };
  } catch (err) {
    console.error("[fundsApi] Network error:", err);
    return { ok: false, error: "Network error" };
  }
}

/**
 * Returns funds suitable for proposal dropdown: active only, or all if status is missing.
 * Matches Funds page display logic - if Funds page can show them, we show them.
 */
export function filterActiveFundsForProposal(funds: FundOption[]): FundOption[] {
  return funds.filter(
    (f) => !f.status || String(f.status).toLowerCase() === "active"
  );
}
