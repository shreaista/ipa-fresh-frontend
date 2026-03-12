import "server-only";

// Investment Committee Memo Generator
//
// Generates professional investment memos from evaluation results.
// Supports text and PDF output formats.

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import {
  uploadBlob,
  listBlobs,
  downloadBlob,
  getDefaultContainer,
} from "@/lib/storage/azureBlob";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StructuredScores {
  sectorFit: number;
  geographyFit: number;
  stageFit: number;
  ticketSizeFit: number;
  riskAdjustment: number;
}

export interface MemoInput {
  proposalId: string;
  proposalName?: string;
  applicant?: string;
  fundName?: string;
  amount?: number;
  fitScore: number | null;
  proposalSummary: string;
  mandateSummary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  confidence: "low" | "medium" | "high";
  structuredScores?: StructuredScores;
  evaluatedAt: string;
  evaluatedByEmail: string;
}

export interface GeneratedMemo {
  text: string;
  metadata: {
    proposalId: string;
    generatedAt: string;
    generatedBy: string;
    fitScore: number | null;
  };
}

export interface MemoMetadata {
  blobPath: string;
  memoId: string;
  generatedAt: string;
  fitScore: number | null;
  format: "pdf" | "text";
  fileName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Path Utilities
// ─────────────────────────────────────────────────────────────────────────────

function generateMemoId(): string {
  return new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
}

function buildMemoPath(tenantId: string, proposalId: string, memoId: string, format: "pdf" | "text"): string {
  const extension = format === "pdf" ? "pdf" : "txt";
  return `tenants/${tenantId}/proposals/${proposalId}/memos/${memoId}/investment_memo.${extension}`;
}

function getMemosPrefix(tenantId: string, proposalId: string): string {
  return `tenants/${tenantId}/proposals/${proposalId}/memos/`;
}

export function validateMemoBlobPath(
  blobPath: string,
  tenantId: string,
  proposalId: string
): boolean {
  const expectedPrefix = `tenants/${tenantId}/proposals/${proposalId}/memos/`;
  return blobPath.startsWith(expectedPrefix) && (blobPath.endsWith(".pdf") || blobPath.endsWith(".txt"));
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Memo Generation
// ─────────────────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatScoreBar(score: number, max: number): string {
  const filled = Math.round((score / max) * 10);
  const empty = 10 - filled;
  return "[" + "█".repeat(filled) + "░".repeat(empty) + "]";
}

export function generateMemoText(input: MemoInput): GeneratedMemo {
  const lines: string[] = [];
  const divider = "═".repeat(70);
  const sectionDivider = "─".repeat(70);

  // Header
  lines.push(divider);
  lines.push("");
  lines.push("                    INVESTMENT COMMITTEE MEMO");
  lines.push("                    CONFIDENTIAL");
  lines.push("");
  lines.push(divider);
  lines.push("");

  // Company / Proposal Information
  lines.push("PROPOSAL OVERVIEW");
  lines.push(sectionDivider);
  lines.push("");
  lines.push(`Proposal ID:      ${input.proposalId}`);
  if (input.proposalName) {
    lines.push(`Company:          ${input.proposalName}`);
  }
  if (input.applicant) {
    lines.push(`Applicant:        ${input.applicant}`);
  }
  if (input.fundName) {
    lines.push(`Target Fund:      ${input.fundName}`);
  }
  if (input.amount) {
    lines.push(`Funding Ask:      ${formatCurrency(input.amount)}`);
  }
  lines.push(`Evaluation Date:  ${formatDate(input.evaluatedAt)}`);
  lines.push(`Evaluated By:     ${input.evaluatedByEmail}`);
  lines.push("");

  // Fit Score Section
  lines.push("FIT SCORE");
  lines.push(sectionDivider);
  lines.push("");
  
  if (input.fitScore !== null) {
    const scoreDescription = input.fitScore >= 85 ? "Strong Fit" :
                             input.fitScore >= 70 ? "Moderate Fit" :
                             input.fitScore >= 50 ? "Weak Fit" : "Poor Fit";
    lines.push(`Overall Score:    ${input.fitScore}/100 (${scoreDescription})`);
    lines.push(`Confidence:       ${input.confidence.charAt(0).toUpperCase() + input.confidence.slice(1)}`);
  } else {
    lines.push("Overall Score:    Not Available");
  }
  lines.push("");

  // Structured Scores (if available)
  if (input.structuredScores) {
    lines.push("Score Breakdown:");
    lines.push("");
    lines.push(`  Sector Fit:       ${formatScoreBar(input.structuredScores.sectorFit, 25)} ${input.structuredScores.sectorFit}/25`);
    lines.push(`  Geography Fit:    ${formatScoreBar(input.structuredScores.geographyFit, 20)} ${input.structuredScores.geographyFit}/20`);
    lines.push(`  Stage Fit:        ${formatScoreBar(input.structuredScores.stageFit, 15)} ${input.structuredScores.stageFit}/15`);
    lines.push(`  Ticket Size Fit:  ${formatScoreBar(input.structuredScores.ticketSizeFit, 15)} ${input.structuredScores.ticketSizeFit}/15`);
    const riskDisplay = input.structuredScores.riskAdjustment;
    lines.push(`  Risk Adjustment:  ${riskDisplay >= 0 ? "None" : riskDisplay}`);
    lines.push("");
  }

  // Investment Thesis / Mandate Summary
  lines.push("INVESTMENT THESIS");
  lines.push(sectionDivider);
  lines.push("");
  lines.push("Mandate Requirements:");
  lines.push(wrapText(input.mandateSummary, 70, "  "));
  lines.push("");
  lines.push("Proposal Summary:");
  lines.push(wrapText(input.proposalSummary, 70, "  "));
  lines.push("");

  // Key Strengths
  lines.push("KEY STRENGTHS");
  lines.push(sectionDivider);
  lines.push("");
  if (input.strengths.length > 0) {
    input.strengths.forEach((strength, i) => {
      lines.push(`  ${i + 1}. ${strength}`);
    });
  } else {
    lines.push("  No specific strengths identified.");
  }
  lines.push("");

  // Key Risks
  lines.push("KEY RISKS");
  lines.push(sectionDivider);
  lines.push("");
  if (input.risks.length > 0) {
    input.risks.forEach((risk, i) => {
      lines.push(`  ${i + 1}. ${risk}`);
    });
  } else {
    lines.push("  No specific risks identified.");
  }
  lines.push("");

  // Due Diligence Questions
  lines.push("DUE DILIGENCE QUESTIONS");
  lines.push(sectionDivider);
  lines.push("");
  const ddQuestions = generateDueDiligenceQuestions(input);
  ddQuestions.forEach((q, i) => {
    lines.push(`  ${i + 1}. ${q}`);
  });
  lines.push("");

  // Recommendations
  lines.push("RECOMMENDATIONS");
  lines.push(sectionDivider);
  lines.push("");
  if (input.recommendations.length > 0) {
    input.recommendations.forEach((rec, i) => {
      lines.push(`  ${i + 1}. ${rec}`);
    });
  } else {
    lines.push("  No specific recommendations provided.");
  }
  lines.push("");

  // Final Recommendation
  lines.push("COMMITTEE RECOMMENDATION");
  lines.push(sectionDivider);
  lines.push("");
  const recommendation = generateCommitteeRecommendation(input);
  lines.push(wrapText(recommendation, 70, "  "));
  lines.push("");

  // Footer
  lines.push(divider);
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("This memo is confidential and intended for internal use only.");
  lines.push("");
  lines.push(divider);

  return {
    text: lines.join("\n"),
    metadata: {
      proposalId: input.proposalId,
      generatedAt: new Date().toISOString(),
      generatedBy: input.evaluatedByEmail,
      fitScore: input.fitScore,
    },
  };
}

function wrapText(text: string, maxWidth: number, prefix: string = ""): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = prefix;

  for (const word of words) {
    if ((currentLine + word).length > maxWidth) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = prefix + word + " ";
    } else {
      currentLine += word + " ";
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  return lines.join("\n");
}

function generateDueDiligenceQuestions(input: MemoInput): string[] {
  const questions: string[] = [];

  // Generate questions based on the evaluation
  if (input.structuredScores) {
    if (input.structuredScores.sectorFit < 20) {
      questions.push("What is the company's competitive advantage in this sector?");
    }
    if (input.structuredScores.geographyFit < 15) {
      questions.push("How does the geographic presence align with our investment thesis?");
    }
    if (input.structuredScores.stageFit < 10) {
      questions.push("Is the company's stage appropriate for this fund's investment criteria?");
    }
    if (input.structuredScores.ticketSizeFit < 10) {
      questions.push("Can the funding amount be adjusted to better fit mandate requirements?");
    }
  }

  // Add standard questions if we don't have enough
  const standardQuestions = [
    "What is the company's path to profitability?",
    "How does the founding team's experience align with the business model?",
    "What are the key milestones for the next 12-18 months?",
    "What is the competitive landscape and moat strategy?",
    "What are the primary customer acquisition channels?",
  ];

  for (const q of standardQuestions) {
    if (questions.length >= 5) break;
    if (!questions.includes(q)) {
      questions.push(q);
    }
  }

  return questions.slice(0, 5);
}

function generateCommitteeRecommendation(input: MemoInput): string {
  if (input.fitScore === null) {
    return "Unable to provide a recommendation due to insufficient evaluation data. " +
           "Please ensure all required documents are uploaded and re-run the evaluation.";
  }

  if (input.fitScore >= 85) {
    return `RECOMMEND PROCEED: This proposal demonstrates strong alignment with the fund mandate ` +
           `(Fit Score: ${input.fitScore}/100). The strengths significantly outweigh identified risks. ` +
           `Proceed to detailed due diligence and term sheet discussion.`;
  }

  if (input.fitScore >= 70) {
    return `RECOMMEND CONDITIONAL REVIEW: This proposal shows moderate alignment with the fund mandate ` +
           `(Fit Score: ${input.fitScore}/100). Address the identified risks and due diligence questions ` +
           `before proceeding. Consider additional information requests.`;
  }

  if (input.fitScore >= 50) {
    return `RECOMMEND HOLD: This proposal shows weak alignment with the fund mandate ` +
           `(Fit Score: ${input.fitScore}/100). Significant concerns exist that require resolution. ` +
           `Consider requesting a revised proposal or additional supporting materials.`;
  }

  return `RECOMMEND DECLINE: This proposal does not align well with the fund mandate ` +
         `(Fit Score: ${input.fitScore}/100). The identified risks and misalignment suggest this ` +
         `opportunity is not suitable for the fund at this time.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Generation
// ─────────────────────────────────────────────────────────────────────────────

interface PDFContext {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  boldFont: PDFFont;
  y: number;
  margin: number;
  lineHeight: number;
  pageWidth: number;
  pageHeight: number;
}

async function createPDFContext(): Promise<PDFContext> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // Letter size
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  return {
    doc,
    page,
    font,
    boldFont,
    y: 750, // Start from top
    margin: 50,
    lineHeight: 14,
    pageWidth: 612,
    pageHeight: 792,
  };
}

function addNewPage(ctx: PDFContext): PDFPage {
  ctx.page = ctx.doc.addPage([ctx.pageWidth, ctx.pageHeight]);
  ctx.y = ctx.pageHeight - ctx.margin;
  return ctx.page;
}

function checkPageBreak(ctx: PDFContext, requiredSpace: number = 50): void {
  if (ctx.y < requiredSpace + ctx.margin) {
    addNewPage(ctx);
  }
}

function drawText(
  ctx: PDFContext,
  text: string,
  options: {
    size?: number;
    bold?: boolean;
    color?: { r: number; g: number; b: number };
    indent?: number;
  } = {}
): void {
  const { size = 10, bold = false, color = { r: 0, g: 0, b: 0 }, indent = 0 } = options;
  const font = bold ? ctx.boldFont : ctx.font;

  checkPageBreak(ctx, size + 5);

  ctx.page.drawText(text, {
    x: ctx.margin + indent,
    y: ctx.y,
    size,
    font,
    color: rgb(color.r, color.g, color.b),
  });

  ctx.y -= ctx.lineHeight;
}

function drawWrappedText(
  ctx: PDFContext,
  text: string,
  options: {
    size?: number;
    maxWidth?: number;
    indent?: number;
  } = {}
): void {
  const { size = 10, maxWidth = ctx.pageWidth - 2 * ctx.margin, indent = 0 } = options;
  const words = text.split(/\s+/);
  let currentLine = "";
  const charWidth = size * 0.5; // Approximate character width

  for (const word of words) {
    const testLine = currentLine ? currentLine + " " + word : word;
    const testWidth = testLine.length * charWidth;

    if (testWidth > maxWidth - indent) {
      if (currentLine) {
        drawText(ctx, currentLine, { size, indent });
      }
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    drawText(ctx, currentLine, { size, indent });
  }
}

function drawSection(ctx: PDFContext, title: string): void {
  checkPageBreak(ctx, 40);
  ctx.y -= 10; // Extra spacing before section
  drawText(ctx, title, { size: 12, bold: true, color: { r: 0.2, g: 0.2, b: 0.5 } });
  
  // Draw underline
  ctx.page.drawLine({
    start: { x: ctx.margin, y: ctx.y + 8 },
    end: { x: ctx.pageWidth - ctx.margin, y: ctx.y + 8 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  
  ctx.y -= 5;
}

function drawScoreBar(ctx: PDFContext, label: string, score: number, max: number): void {
  const barWidth = 100;
  const barHeight = 8;
  const labelWidth = 100;
  const x = ctx.margin + labelWidth;

  checkPageBreak(ctx, 20);

  // Draw label
  ctx.page.drawText(label, {
    x: ctx.margin,
    y: ctx.y,
    size: 9,
    font: ctx.font,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Draw background bar
  ctx.page.drawRectangle({
    x,
    y: ctx.y - 2,
    width: barWidth,
    height: barHeight,
    color: rgb(0.9, 0.9, 0.9),
  });

  // Draw filled bar
  const fillWidth = (score / max) * barWidth;
  ctx.page.drawRectangle({
    x,
    y: ctx.y - 2,
    width: fillWidth,
    height: barHeight,
    color: rgb(0.3, 0.4, 0.7),
  });

  // Draw score text
  ctx.page.drawText(`${score}/${max}`, {
    x: x + barWidth + 10,
    y: ctx.y,
    size: 9,
    font: ctx.font,
    color: rgb(0.3, 0.3, 0.3),
  });

  ctx.y -= ctx.lineHeight + 2;
}

export async function generateMemoPDF(input: MemoInput): Promise<Uint8Array> {
  const ctx = await createPDFContext();

  // Header
  drawText(ctx, "INVESTMENT COMMITTEE MEMO", { size: 18, bold: true, color: { r: 0.1, g: 0.1, b: 0.3 } });
  drawText(ctx, "CONFIDENTIAL", { size: 10, color: { r: 0.5, g: 0.5, b: 0.5 } });
  ctx.y -= 15;

  // Proposal Overview
  drawSection(ctx, "PROPOSAL OVERVIEW");
  drawText(ctx, `Proposal ID: ${input.proposalId}`, { indent: 10 });
  if (input.proposalName) {
    drawText(ctx, `Company: ${input.proposalName}`, { indent: 10 });
  }
  if (input.applicant) {
    drawText(ctx, `Applicant: ${input.applicant}`, { indent: 10 });
  }
  if (input.fundName) {
    drawText(ctx, `Target Fund: ${input.fundName}`, { indent: 10 });
  }
  if (input.amount) {
    drawText(ctx, `Funding Ask: ${formatCurrency(input.amount)}`, { indent: 10 });
  }
  drawText(ctx, `Evaluation Date: ${formatDate(input.evaluatedAt)}`, { indent: 10 });
  ctx.y -= 5;

  // Fit Score
  drawSection(ctx, "FIT SCORE");
  if (input.fitScore !== null) {
    const scoreDescription = input.fitScore >= 85 ? "Strong Fit" :
                             input.fitScore >= 70 ? "Moderate Fit" :
                             input.fitScore >= 50 ? "Weak Fit" : "Poor Fit";
    const scoreColor = input.fitScore >= 85 ? { r: 0.1, g: 0.6, b: 0.2 } :
                       input.fitScore >= 70 ? { r: 0.7, g: 0.5, b: 0.1 } :
                       { r: 0.7, g: 0.2, b: 0.2 };
    drawText(ctx, `Overall Score: ${input.fitScore}/100 (${scoreDescription})`, { 
      size: 14, bold: true, indent: 10, color: scoreColor 
    });
    drawText(ctx, `Confidence: ${input.confidence.charAt(0).toUpperCase() + input.confidence.slice(1)}`, { indent: 10 });
  } else {
    drawText(ctx, "Overall Score: Not Available", { indent: 10 });
  }
  ctx.y -= 5;

  // Structured Scores
  if (input.structuredScores) {
    drawText(ctx, "Score Breakdown:", { size: 10, bold: true, indent: 10 });
    ctx.y -= 3;
    drawScoreBar(ctx, "Sector Fit", input.structuredScores.sectorFit, 25);
    drawScoreBar(ctx, "Geography Fit", input.structuredScores.geographyFit, 20);
    drawScoreBar(ctx, "Stage Fit", input.structuredScores.stageFit, 15);
    drawScoreBar(ctx, "Ticket Size Fit", input.structuredScores.ticketSizeFit, 15);
    
    const riskText = input.structuredScores.riskAdjustment === 0 
      ? "Risk Adjustment: None" 
      : `Risk Adjustment: ${input.structuredScores.riskAdjustment}`;
    drawText(ctx, riskText, { indent: 10, color: input.structuredScores.riskAdjustment < 0 ? { r: 0.7, g: 0.2, b: 0.2 } : { r: 0.1, g: 0.6, b: 0.2 } });
  }
  ctx.y -= 5;

  // Investment Thesis
  drawSection(ctx, "INVESTMENT THESIS");
  drawText(ctx, "Mandate Requirements:", { bold: true, indent: 10 });
  drawWrappedText(ctx, input.mandateSummary, { indent: 20, maxWidth: ctx.pageWidth - 2 * ctx.margin - 20 });
  ctx.y -= 5;
  drawText(ctx, "Proposal Summary:", { bold: true, indent: 10 });
  drawWrappedText(ctx, input.proposalSummary, { indent: 20, maxWidth: ctx.pageWidth - 2 * ctx.margin - 20 });
  ctx.y -= 5;

  // Key Strengths
  drawSection(ctx, "KEY STRENGTHS");
  if (input.strengths.length > 0) {
    input.strengths.forEach((strength, i) => {
      drawWrappedText(ctx, `${i + 1}. ${strength}`, { indent: 10, maxWidth: ctx.pageWidth - 2 * ctx.margin - 10 });
    });
  } else {
    drawText(ctx, "No specific strengths identified.", { indent: 10 });
  }
  ctx.y -= 5;

  // Key Risks
  drawSection(ctx, "KEY RISKS");
  if (input.risks.length > 0) {
    input.risks.forEach((risk, i) => {
      drawWrappedText(ctx, `${i + 1}. ${risk}`, { indent: 10, maxWidth: ctx.pageWidth - 2 * ctx.margin - 10 });
    });
  } else {
    drawText(ctx, "No specific risks identified.", { indent: 10 });
  }
  ctx.y -= 5;

  // Due Diligence Questions
  drawSection(ctx, "DUE DILIGENCE QUESTIONS");
  const ddQuestions = generateDueDiligenceQuestions(input);
  ddQuestions.forEach((q, i) => {
    drawWrappedText(ctx, `${i + 1}. ${q}`, { indent: 10, maxWidth: ctx.pageWidth - 2 * ctx.margin - 10 });
  });
  ctx.y -= 5;

  // Recommendations
  drawSection(ctx, "RECOMMENDATIONS");
  if (input.recommendations.length > 0) {
    input.recommendations.forEach((rec, i) => {
      drawWrappedText(ctx, `${i + 1}. ${rec}`, { indent: 10, maxWidth: ctx.pageWidth - 2 * ctx.margin - 10 });
    });
  } else {
    drawText(ctx, "No specific recommendations provided.", { indent: 10 });
  }
  ctx.y -= 5;

  // Committee Recommendation
  drawSection(ctx, "COMMITTEE RECOMMENDATION");
  const recommendation = generateCommitteeRecommendation(input);
  drawWrappedText(ctx, recommendation, { indent: 10, maxWidth: ctx.pageWidth - 2 * ctx.margin - 10 });
  ctx.y -= 10;

  // Footer
  checkPageBreak(ctx, 40);
  ctx.page.drawLine({
    start: { x: ctx.margin, y: ctx.y },
    end: { x: ctx.pageWidth - ctx.margin, y: ctx.y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  ctx.y -= 15;
  drawText(ctx, `Generated: ${new Date().toISOString()}`, { size: 8, color: { r: 0.5, g: 0.5, b: 0.5 } });
  drawText(ctx, "This memo is confidential and intended for internal use only.", { size: 8, color: { r: 0.5, g: 0.5, b: 0.5 } });

  return ctx.doc.save();
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadMemoPDF(
  tenantId: string,
  proposalId: string,
  pdfBytes: Uint8Array,
  fitScore: number | null
): Promise<{ blobPath: string; memoId: string }> {
  const container = getDefaultContainer();
  const memoId = generateMemoId();
  const blobPath = buildMemoPath(tenantId, proposalId, memoId, "pdf");

  console.log(`[memoGenerator] Saving memo PDF to: ${blobPath} (fitScore: ${fitScore})`);

  await uploadBlob({
    container,
    path: blobPath,
    contentType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });

  console.log(`[memoGenerator] Memo PDF saved: ${blobPath}`);
  console.log("[memoGenerator] memo generated");

  return { blobPath, memoId };
}

export async function listMemos(
  tenantId: string,
  proposalId: string
): Promise<MemoMetadata[]> {
  const container = getDefaultContainer();
  const prefix = getMemosPrefix(tenantId, proposalId);

  const blobs = await listBlobs({ container, prefix });

  const memos: MemoMetadata[] = [];

  for (const blob of blobs) {
    if (!blob.path.endsWith(".pdf") && !blob.path.endsWith(".txt")) continue;

    const match = blob.path.match(/memos\/(\d{8}T\d{6}Z)\//);
    const memoId = match ? match[1] : "";
    const format = blob.path.endsWith(".pdf") ? "pdf" : "text";
    const fileName = blob.path.split("/").pop() || `investment_memo.${format}`;

    memos.push({
      blobPath: blob.path,
      memoId,
      generatedAt: blob.lastModified || "",
      fitScore: null, // Could be extracted from metadata if needed
      format,
      fileName,
    });
  }

  // Sort by generatedAt DESC (newest first)
  memos.sort((a, b) => {
    const dateA = new Date(a.generatedAt).getTime() || 0;
    const dateB = new Date(b.generatedAt).getTime() || 0;
    return dateB - dateA;
  });

  if (memos.length > 0) {
    console.log("[memoGenerator] latest memo loaded");
  }
  console.log("[memoGenerator] memo history count:", memos.length);

  return memos;
}

export async function downloadMemo(
  tenantId: string,
  proposalId: string,
  blobPath: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  console.log("[memoGenerator] memo download requested");

  if (!validateMemoBlobPath(blobPath, tenantId, proposalId)) {
    return null;
  }

  const container = getDefaultContainer();
  const result = await downloadBlob(container, blobPath);

  if (!result) {
    return null;
  }

  const contentType = blobPath.endsWith(".pdf") ? "application/pdf" : "text/plain";
  return { buffer: result.buffer, contentType };
}
