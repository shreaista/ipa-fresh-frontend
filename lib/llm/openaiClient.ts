import "server-only";

// OpenAI / Azure OpenAI Client for Proposal Evaluation
//
// Priority:
// 1. If AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, AZURE_OPENAI_DEPLOYMENT are set -> use Azure OpenAI
// 2. If OPENAI_API_KEY is set -> use standard OpenAI
// 3. Otherwise -> fallback to stub
//
// Uses Chat Completions API to evaluate proposals against fund mandates.
// Validates responses with Zod schema and retries once if JSON is invalid.

import {
  type LLMEvaluationResponse,
  validateLLMResponse,
} from "@/lib/evaluation/types";

import {
  isAzureOpenAIConfigured,
  getAzureOpenAIDeploymentName,
  runAzureEvaluationLLM,
  type RunAzureEvaluationResult,
  type RAGInput,
} from "./azureOpenAIClient";

// Re-export RAGInput type for use in proposalEvaluator
export type { RAGInput };

// Re-export Azure functions for external use
export { isAzureOpenAIConfigured, getAzureOpenAIDeploymentName };

import type { ValidationLLMResult } from "@/lib/evaluation/validationTypes";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

// NEW: Get OpenAI configuration from environment
function getOpenAIConfig(): { apiKey: string; model: string; baseUrl: string } {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is required. " +
      "Please set it in your .env.local file."
    );
  }

  return {
    apiKey,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RunEvaluationLLMParams {
  mandateText: string;
  proposalText: string;
  context: {
    proposalId: string;
    fundName: string;
    mandateKey: string | null;
  };
  // Optional RAG input - when provided, uses matched sections instead of full text
  ragInput?: RAGInput;
}

export interface RunEvaluationLLMResult {
  success: boolean;
  response?: LLMEvaluationResponse;
  model: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompts
// ─────────────────────────────────────────────────────────────────────────────

// NEW: System prompt for evaluation
const SYSTEM_PROMPT = `You are an expert investment analyst reviewing proposals against fund mandates.

Your task is to evaluate how well a proposal fits a fund's investment mandate and provide a structured assessment.

Guidelines:
- Be objective and thorough in your analysis
- Consider alignment with strategy, geography, and investment criteria
- Identify both strengths and potential risks
- Provide actionable recommendations
- Confidence level should reflect the quality of information provided

You MUST respond with valid JSON only, no additional text.`;

// NEW: Build user prompt with content and schema
function buildUserPrompt(
  mandateText: string,
  proposalText: string,
  context: { proposalId: string; fundName: string; mandateKey: string | null },
  ragInput?: RAGInput
): string {
  // Use RAG-matched sections if available, otherwise fall back to full text
  let mandateSection: string;
  let proposalSection: string;

  if (ragInput && ragInput.topMandateSections.length > 0) {
    // RAG mode: use matched sections
    const formattedSections = ragInput.topMandateSections
      .map((section, i) => `[Relevant Section ${i + 1}]\n${section}`)
      .join("\n\n---\n\n");
    
    mandateSection = `The following mandate sections were identified as most relevant to the proposal:\n\n${formattedSections}`;
    proposalSection = ragInput.proposalSummary || proposalText || "No proposal document content available.";

    // Add matched pairs context if available
    if (ragInput.matchedPairs.length > 0) {
      const topPairs = ragInput.matchedPairs.slice(0, 5);
      const pairsContext = topPairs
        .map((pair, i) => `Match ${i + 1} (score: ${pair.score}):\n  Proposal: "${pair.proposalExcerpt.substring(0, 100)}..."\n  Mandate: "${pair.mandateExcerpt.substring(0, 100)}..."`)
        .join("\n\n");
      
      mandateSection += `\n\n## Key Matches Between Proposal and Mandate\n${pairsContext}`;
    }
  } else {
    // Fallback: use full text
    mandateSection = mandateText || "No mandate template content available.";
    proposalSection = proposalText || "No proposal document content available.";
  }

  return `## Fund Mandate
${mandateSection}

## Proposal (ID: ${context.proposalId}, Fund: ${context.fundName})
${proposalSection}

## Required Output Format (JSON)
Respond with a JSON object matching this exact schema:
{
  "fitScore": <number 0-100, where 100 is perfect fit>,
  "mandateSummary": "<1-2 sentence summary of the mandate's key requirements>",
  "proposalSummary": "<1-2 sentence summary of what the proposal is asking for>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "risks": ["<risk 1>", "<risk 2>", ...],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...],
  "confidence": "<'low' | 'medium' | 'high' - based on information quality>",
  "scoringInput": {
    "sectorMatch": "<'full' | 'partial' | 'none' | 'unknown' - how well proposal sector matches mandate>",
    "geographyMatch": "<'full' | 'partial' | 'none' | 'unknown' - how well proposal geography matches mandate>",
    "stageMatch": "<'full' | 'partial' | 'none' | 'unknown' - how well investment stage matches mandate>",
    "ticketSizeMatch": "<'full' | 'partial' | 'none' | 'unknown' - how well requested amount matches mandate range>",
    "identifiedRisks": ["<key risk 1>", "<key risk 2>", ... - main risks affecting fit]
  }
}

Scoring guide:
- sectorMatch: 'full' if exact sector match, 'partial' if related sector, 'none' if mismatch, 'unknown' if unclear
- geographyMatch: 'full' if exact geographic match, 'partial' if overlapping region, 'none' if outside mandate, 'unknown' if unclear
- stageMatch: 'full' if exact stage match (seed, series A, etc.), 'partial' if adjacent stage, 'none' if mismatch, 'unknown' if unclear
- ticketSizeMatch: 'full' if within mandate range, 'partial' if close to range, 'none' if far outside, 'unknown' if amount unclear

Respond with ONLY the JSON object, no markdown formatting or additional text.`;
}

// NEW: Retry prompt when JSON is invalid
function buildRetryPrompt(originalResponse: string, error: string): string {
  return `Your previous response was not valid JSON. Error: ${error}

Please fix the JSON and respond with ONLY a valid JSON object matching this schema:
{
  "fitScore": <number 0-100>,
  "mandateSummary": "<string>",
  "proposalSummary": "<string>",
  "strengths": ["<string>", ...],
  "risks": ["<string>", ...],
  "recommendations": ["<string>", ...],
  "confidence": "<'low' | 'medium' | 'high'>",
  "scoringInput": {
    "sectorMatch": "<'full' | 'partial' | 'none' | 'unknown'>",
    "geographyMatch": "<'full' | 'partial' | 'none' | 'unknown'>",
    "stageMatch": "<'full' | 'partial' | 'none' | 'unknown'>",
    "ticketSizeMatch": "<'full' | 'partial' | 'none' | 'unknown'>",
    "identifiedRisks": ["<string>", ...]
  }
}

Your previous response was:
${originalResponse.substring(0, 500)}${originalResponse.length > 500 ? "..." : ""}

Respond with ONLY valid JSON, no additional text or markdown.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI API Call
// ─────────────────────────────────────────────────────────────────────────────

// NEW: Call OpenAI Chat Completions API
async function callOpenAI(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  config: { apiKey: string; model: string; baseUrl: string }
): Promise<{ content: string; model: string }> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.choices?.[0]?.message?.content) {
    throw new Error("Invalid OpenAI response: no content in response");
  }

  return {
    content: data.choices[0].message.content,
    model: data.model || config.model,
  };
}

// NEW: Parse JSON from LLM response (handles markdown code blocks)
function parseJSONResponse(content: string): unknown {
  let jsonStr = content.trim();
  
  // Remove markdown code blocks if present
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  
  jsonStr = jsonStr.trim();
  
  return JSON.parse(jsonStr);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Evaluation Function
// ─────────────────────────────────────────────────────────────────────────────

// NEW: Run LLM evaluation with retry on invalid JSON
export async function runEvaluationLLM(
  params: RunEvaluationLLMParams
): Promise<RunEvaluationLLMResult> {
  const { mandateText, proposalText, context, ragInput } = params;

  try {
    const config = getOpenAIConfig();

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(mandateText, proposalText, context, ragInput) },
    ];

    // First attempt
    const firstResponse = await callOpenAI(messages, config);
    
    try {
      const parsed = parseJSONResponse(firstResponse.content);
      const validation = validateLLMResponse(parsed);
      
      if (validation.success && validation.data) {
        return {
          success: true,
          response: validation.data,
          model: firstResponse.model,
        };
      }

      // Invalid schema, retry with fix prompt
      console.warn("[openaiClient] First response validation failed:", validation.error);
      
      messages.push({ role: "assistant", content: firstResponse.content });
      messages.push({ role: "user", content: buildRetryPrompt(firstResponse.content, validation.error || "Invalid schema") });

      const retryResponse = await callOpenAI(messages, config);
      const retryParsed = parseJSONResponse(retryResponse.content);
      const retryValidation = validateLLMResponse(retryParsed);

      if (retryValidation.success && retryValidation.data) {
        return {
          success: true,
          response: retryValidation.data,
          model: retryResponse.model,
        };
      }

      return {
        success: false,
        model: retryResponse.model,
        error: `LLM response validation failed after retry: ${retryValidation.error}`,
      };

    } catch (parseError) {
      // JSON parse failed, retry with fix prompt
      console.warn("[openaiClient] JSON parse failed:", parseError);

      messages.push({ role: "assistant", content: firstResponse.content });
      messages.push({
        role: "user",
        content: buildRetryPrompt(
          firstResponse.content,
          parseError instanceof Error ? parseError.message : "Invalid JSON"
        ),
      });

      const retryResponse = await callOpenAI(messages, config);
      
      try {
        const retryParsed = parseJSONResponse(retryResponse.content);
        const retryValidation = validateLLMResponse(retryParsed);

        if (retryValidation.success && retryValidation.data) {
          return {
            success: true,
            response: retryValidation.data,
            model: retryResponse.model,
          };
        }

        return {
          success: false,
          model: retryResponse.model,
          error: `LLM response validation failed after retry: ${retryValidation.error}`,
        };
      } catch (retryParseError) {
        return {
          success: false,
          model: config.model,
          error: `Failed to parse LLM response after retry: ${retryParseError instanceof Error ? retryParseError.message : "Unknown error"}`,
        };
      }
    }

  } catch (error) {
    console.error("[openaiClient] LLM evaluation failed:", error);
    return {
      success: false,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Check if standard OpenAI is configured
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// Check if any LLM provider is configured (Azure OpenAI takes priority)
export function isLLMConfigured(): boolean {
  return isAzureOpenAIConfigured() || isOpenAIConfigured();
}

// Get the active LLM provider type
export function getLLMProvider(): "azure-openai" | "openai" | "stub" {
  if (isAzureOpenAIConfigured()) return "azure-openai";
  if (isOpenAIConfigured()) return "openai";
  return "stub";
}

// Get the model name for the active provider
export function getActiveModelName(): string {
  if (isAzureOpenAIConfigured()) {
    return getAzureOpenAIDeploymentName();
  }
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation Extraction (Proposal Validation Engine)
// ─────────────────────────────────────────────────────────────────────────────

const VALIDATION_SYSTEM_PROMPT = `You are an expert analyst extracting structured data from investment proposals.

Extract the following from the proposal text. Respond with valid JSON only, no additional text.`;

const VALIDATION_USER_PROMPT = (text: string) => `## Proposal Text (excerpt)
${text.slice(0, 8000)}

## Required Output (JSON)
{
  "stage": "<'pre-revenue' | 'revenue' | 'growth' | 'unknown'>",
  "businessModelClarity": "<'clear' | 'partial' | 'unclear' | 'unknown'>",
  "competitorPresence": "<'identified' | 'mentioned' | 'none' | 'unknown'>"
}

- stage: Investment stage based on revenue, growth, and funding round context
- businessModelClarity: How clearly the business model and monetization are explained
- competitorPresence: Whether competitors are identified by name, merely mentioned, or absent

Respond with ONLY the JSON object.`;

function parseValidationResponse(content: string): ValidationLLMResult | null {
  try {
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
    else if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr) as Record<string, string>;
    const stage = ["pre-revenue", "revenue", "growth", "unknown"].includes(parsed?.stage)
      ? (parsed.stage as ValidationLLMResult["stage"])
      : "unknown";
    const businessModelClarity = ["clear", "partial", "unclear", "unknown"].includes(
      parsed?.businessModelClarity
    )
      ? (parsed.businessModelClarity as ValidationLLMResult["businessModelClarity"])
      : "unknown";
    const competitorPresence = ["identified", "mentioned", "none", "unknown"].includes(
      parsed?.competitorPresence
    )
      ? (parsed.competitorPresence as ValidationLLMResult["competitorPresence"])
      : "unknown";

    return { stage, businessModelClarity, competitorPresence };
  } catch {
    return null;
  }
}

export async function runOpenAIValidationExtraction(
  proposalText: string
): Promise<ValidationLLMResult | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const config = getOpenAIConfig();
    const messages: Array<{ role: "system" | "user"; content: string }> = [
      { role: "system", content: VALIDATION_SYSTEM_PROMPT },
      { role: "user", content: VALIDATION_USER_PROMPT(proposalText) },
    ];
    const response = await callOpenAI(messages, config);
    return parseValidationResponse(response.content);
  } catch (error) {
    console.warn("[openaiClient] Validation extraction failed:", error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified evaluation function that routes to the appropriate provider
// ─────────────────────────────────────────────────────────────────────────────

export async function runEvaluationWithProvider(
  params: RunEvaluationLLMParams
): Promise<RunEvaluationLLMResult & { provider: "azure-openai" | "openai" }> {
  // Azure OpenAI takes priority
  if (isAzureOpenAIConfigured()) {
    console.log("[openaiClient] Using Azure OpenAI for evaluation");
    const result: RunAzureEvaluationResult = await runAzureEvaluationLLM(params);
    return {
      ...result,
      provider: "azure-openai",
    };
  }

  // Fall back to standard OpenAI
  console.log("[openaiClient] Using standard OpenAI for evaluation");
  const result = await runEvaluationLLM(params);
  return {
    ...result,
    provider: "openai",
  };
}
