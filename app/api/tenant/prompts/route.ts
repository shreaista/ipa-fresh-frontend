// GET /api/tenant/prompts - List prompts (global + fund-specific)
// POST /api/tenant/prompts - Create/update prompt

import { NextResponse } from "next/server";
import { requireRoleWithTenantContext } from "@/lib/authz";
import { getPrompt, setPrompt, getStoreKey } from "@/lib/prompts/promptStore";

const GLOBAL_PROMPT_KEYS = ["evaluation_system", "validation_system"] as const;

// Seed default content
const DEFAULT_EVALUATION_SYSTEM = `You are an expert investment analyst reviewing proposals against fund mandates.

Your task is to evaluate how well a proposal fits a fund's investment mandate and provide a structured assessment.

Guidelines:
- Be objective and thorough in your analysis
- Consider alignment with strategy, geography, and investment criteria
- Identify both strengths and potential risks
- Provide actionable recommendations
- Confidence level should reflect the quality of information provided

You MUST respond with valid JSON only, no additional text.`;

const DEFAULT_VALIDATION_SYSTEM = `You are an expert analyst extracting structured data from investment proposals.

Extract the requested fields from the proposal text. Respond with valid JSON only.`;

export async function GET(req: Request) {
  try {
    const { tenantId } = await requireRoleWithTenantContext(["tenant_admin", "saas_admin"]);
    const { searchParams } = new URL(req.url);
    const fundId = searchParams.get("fundId") ?? undefined;

    const global: { key: string; content: string; versions: { id: string; savedAt: string }[] }[] = [];
    for (const key of GLOBAL_PROMPT_KEYS) {
      const stored = getPrompt(tenantId, key);
      const content = stored?.content ?? (key === "evaluation_system" ? DEFAULT_EVALUATION_SYSTEM : DEFAULT_VALIDATION_SYSTEM);
      const versions = (stored?.versions ?? []).map((v) => ({ id: v.id, savedAt: v.savedAt }));
      global.push({ key, content, versions });
    }

    const fundSpecific: { fundId: string; key: string; content: string }[] = [];
    if (fundId) {
      const stored = getPrompt(tenantId, "evaluation_system", fundId);
      if (stored) {
        fundSpecific.push({ fundId, key: "evaluation_system", content: stored.content });
      }
    }

    return NextResponse.json({
      ok: true,
      data: { global, fundSpecific },
    });
  } catch (e) {
    console.error("[prompts] GET error:", e);
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await requireRoleWithTenantContext(["tenant_admin", "saas_admin"]);
    const body = await req.json();
    const { key, content, fundId } = body as { key: string; content?: string; fundId?: string };

    if (!key || typeof content !== "string") {
      return NextResponse.json({ ok: false, error: "key and content required" }, { status: 400 });
    }

    const { savedAt } = setPrompt(tenantId, key, content, fundId);

    return NextResponse.json({
      ok: true,
      data: { key, fundId: fundId ?? null, savedAt },
    });
  } catch (e) {
    console.error("[prompts] POST error:", e);
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}
