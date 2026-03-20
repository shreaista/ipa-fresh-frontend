// GET /api/tenant/proposals/[id]/report/download
// Downloads report as PDF

import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireTenant,
  jsonError,
  AuthzHttpError,
} from "@/lib/authz";
import { getProposalById } from "@/lib/mock/proposals";
import { getLatestReport, generateReportPDF } from "@/lib/evaluation/reportEngine";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id: proposalId } = await context.params;

  try {
    console.log("[report/download] PDF download requested for proposal", proposalId);

    const user = await requireSession();
    const tenantId = requireTenant(user);

    const proposal = getProposalById(proposalId);
    if (!proposal) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    if (proposal.tenantId !== tenantId) {
      throw new AuthzHttpError(403, "Proposal not in your tenant");
    }

    const report = await getLatestReport(tenantId, proposalId);
    if (!report) {
      throw new AuthzHttpError(404, "No report found. Generate a report first.");
    }

    const pdfBytes = await generateReportPDF(report);
    console.log("[report/download] PDF generated successfully");

    const filename = `Investment_Report_${proposalId}_${report.reportId}.pdf`;
    const buffer = Buffer.from(pdfBytes);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[report/download] Error for proposal", proposalId, error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    const message = error instanceof Error ? error.message : "PDF generation failed";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
