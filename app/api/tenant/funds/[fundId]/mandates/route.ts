import { NextRequest, NextResponse } from "next/server";
import { getAuthzContext, jsonError, AuthzHttpError } from "@/lib/authz";
import { requireActiveTenantId } from "@/lib/tenantContext";
import {
  getFundById,
  getLinkedMandates,
  getFundMandateLinks,
  unlinkMandateFromFund,
} from "@/lib/mock/fundsStore";
import { listFundMandates, getFundMandateById } from "@/lib/mock/fundMandates";
import {
  uploadBlob,
  buildFundMandatePath,
  getDefaultContainer,
} from "@/lib/storage/azureBlob";

interface RouteContext {
  params: Promise<{ fundId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  let fundId: string | undefined;
  
  console.log("[fundMandates] GET request received");
  
  try {
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const tenantId = await requireActiveTenantId();
    
    const params = await context.params;
    fundId = String(params.fundId || "");
    
    console.log("[fundMandates] GET method: GET, fundId:", fundId);

    if (ctx.role !== "tenant_admin" && ctx.role !== "saas_admin") {
      return NextResponse.json(
        { ok: false, error: "Only administrators can view fund mandates" },
        { status: 403 }
      );
    }

    let fund = null;
    try {
      fund = getFundById(tenantId, fundId);
    } catch (err) {
      console.error("[fundMandates] Error fetching fund:", err);
    }
    
    console.log("[fundMandates] data source: mock store");
    
    if (!fund) {
      console.log("[fundMandates] fund not found for fundId:", fundId);
      return NextResponse.json(
        { ok: false, error: "Fund not found" },
        { status: 404 }
      );
    }

    let linkedMandateIds: string[] = [];
    let links: { mandateId: string; linkedAt?: string }[] = [];
    let allMandates: ReturnType<typeof listFundMandates> = [];
    
    try {
      linkedMandateIds = getLinkedMandates(tenantId, fundId);
    } catch (err) {
      console.error("[fundMandates] Error getting linked mandates:", err);
    }
    
    try {
      links = getFundMandateLinks(tenantId, fundId);
    } catch (err) {
      console.error("[fundMandates] Error getting mandate links:", err);
    }
    
    try {
      allMandates = listFundMandates(tenantId);
    } catch (err) {
      console.error("[fundMandates] Error listing mandates:", err);
    }

    const linkedMandates = linkedMandateIds
      .map((id) => {
        try {
          const mandate = getFundMandateById(tenantId, id);
          const link = links.find((l) => l.mandateId === id);
          return mandate ? { ...mandate, linkedAt: link?.linkedAt } : null;
        } catch (err) {
          console.error("[fundMandates] Error processing mandate id:", id, err);
          return null;
        }
      })
      .filter(Boolean);

    const availableMandates = allMandates.filter(
      (m) => !linkedMandateIds.includes(m.id)
    );

    const mandates = [...linkedMandates, ...availableMandates];
    
    console.log("[fundMandates] returning", mandates.length, "mandates for fundId:", fundId);

    return NextResponse.json({
      ok: true,
      data: {
        fundId,
        mandates,
        fund,
        linkedMandates,
        availableMandates,
      },
    });
  } catch (error) {
    console.error("[fundMandates] error for fundId:", fundId, error);
    return jsonError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  let fundId: string | undefined;
  
  console.log("[fundMandates.upload] POST request received");
  console.log("[fundMandates.upload] method: POST");
  
  try {
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const tenantIdFromContext = await requireActiveTenantId();
    const params = await context.params;
    fundId = String(params.fundId || "");
    
    console.log("[fundMandates.upload] fundId:", fundId);

    if (ctx.role !== "tenant_admin" && ctx.role !== "saas_admin") {
      throw new AuthzHttpError(403, "Only administrators can manage mandates");
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error("[fundMandates.upload] Failed to parse form data:", error);
      throw new AuthzHttpError(400, "Invalid form data");
    }

    const file = formData.get("file") as File | null;
    const mandateKey = formData.get("mandateKey") as string | null;
    
    console.log("[fundMandates.upload] file exists:", !!file);
    console.log("[fundMandates.upload] mandateKey:", mandateKey);

    if (!file) {
      throw new AuthzHttpError(400, "File is required");
    }

    if (file.size === 0) {
      throw new AuthzHttpError(400, "File cannot be empty");
    }

    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const allowedContentTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    const isValidExtension = allowedExtensions.includes(extension);
    const isValidContentType = allowedContentTypes.includes(file.type);

    if (!isValidExtension && !isValidContentType) {
      throw new AuthzHttpError(400, "Only PDF, DOC, and DOCX files are supported.");
    }

    if (!fundId) {
      throw new AuthzHttpError(400, "fundId is required");
    }

    if (!tenantIdFromContext) {
      throw new AuthzHttpError(400, "tenantId is required");
    }

    const tenantId = tenantIdFromContext;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const blobPath = buildFundMandatePath(tenantId, fundId, file.name);
    const container = getDefaultContainer();

    console.log("[fundMandates.upload] uploading to blobPath:", blobPath);

    await uploadBlob({
      container,
      path: blobPath,
      contentType: file.type || "application/octet-stream",
      buffer,
      metadata: {
        tenantId,
        fundId,
        originalFilename: file.name,
        ...(mandateKey ? { mandateKey } : {}),
      },
    });

    console.log("[fundMandates.upload] upload successful, fileName:", file.name);

    return NextResponse.json({
      ok: true,
      data: {
        fundId,
        fileName: file.name,
        blobPath,
      },
    });
  } catch (error) {
    console.error("[fundMandates.upload]", error);
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const tenantId = await requireActiveTenantId();
    const { fundId } = await context.params;

    if (ctx.role !== "tenant_admin" && ctx.role !== "saas_admin") {
      throw new AuthzHttpError(403, "Only administrators can unlink mandates");
    }

    const { searchParams } = new URL(request.url);
    const mandateId = searchParams.get("mandateId");

    if (!mandateId) {
      throw new AuthzHttpError(400, "mandateId query parameter is required");
    }

    const unlinked = unlinkMandateFromFund(tenantId, fundId, mandateId);

    if (!unlinked) {
      throw new AuthzHttpError(404, "Link not found");
    }

    return NextResponse.json({
      ok: true,
      data: { message: "Mandate unlinked successfully" },
    });
  } catch (error) {
    return jsonError(error);
  }
}
