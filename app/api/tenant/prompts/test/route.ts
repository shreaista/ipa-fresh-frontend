// POST /api/tenant/prompts/test - Test a prompt with sample input
// Returns simulated output (no real LLM call for now)

import { NextResponse } from "next/server";
import { requireRoleWithTenantContext } from "@/lib/authz";

export async function POST(req: Request) {
  try {
    await requireRoleWithTenantContext(["tenant_admin", "saas_admin"]);
    const body = await req.json();
    const { systemPrompt, userInput } = body as { systemPrompt?: string; userInput?: string };

    // Simulated output - in production this would call the LLM
    const simulatedOutput = `{
  "fitScore": 72,
  "mandateSummary": "Sample mandate summary from test run.",
  "proposalSummary": "Sample proposal summary from test run.",
  "strengths": ["Strong sector alignment", "Clear business model"],
  "risks": ["Limited track record", "Competitive market"],
  "recommendations": ["Request additional financial projections", "Verify IP ownership"],
  "confidence": "medium",
  "scoringInput": {
    "sectorMatch": "full",
    "geographyMatch": "partial",
    "stageMatch": "full",
    "ticketSizeMatch": "full",
    "identifiedRisks": ["Limited track record"]
  }
}`;

    return NextResponse.json({
      ok: true,
      data: {
        output: simulatedOutput,
        note: "This is a simulated response. Connect to an LLM endpoint for real testing.",
      },
    });
  } catch (e) {
    console.error("[prompts/test] POST error:", e);
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}
