import "server-only";

// Azure OpenAI Client for Proposal Evaluation
//
// Uses Azure OpenAI Chat Completions API.
// Requires environment variables:
// - AZURE_OPENAI_ENDPOINT (e.g., https://your-resource.openai.azure.com)
// - AZURE_OPENAI_KEY
// - AZURE_OPENAI_DEPLOYMENT (model deployment name)

import {
  type LLMEvaluationResponse,
  validateLLMResponse,
} from "@/lib/evaluation/types";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  apiVersion: string;
}

function getAzureOpenAIConfig(): AzureOpenAIConfig {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_KEY;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT;

  if (!endpoint || !apiKey || !deploymentName) {
    throw new Error(
      "Azure OpenAI requires AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, and AZURE_OPENAI_DEPLOYMENT environment variables."
    );
  }

  return {
    endpoint: endpoint.replace(/\/$/, ""), // Remove trailing slash if present
    apiKey,
    deploymentName,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview",
  };
}

// Check if Azure OpenAI is configured
export function isAzureOpenAIConfigured(): boolean {
  return !!(
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_KEY &&
    process.env.AZURE_OPENAI_DEPLOYMENT
  );
}

// Get deployment name for model field in reports
export function getAzureOpenAIDeploymentName(): string {
  return process.env.AZURE_OPENAI_DEPLOYMENT || "unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MatchedPairInfo {
  proposalExcerpt: string;
  mandateExcerpt: string;
  score: number;
}

export interface RAGInput {
  proposalSummary: string;
  topMandateSections: string[];
  matchedPairs: MatchedPairInfo[];
}

export interface RunAzureEvaluationParams {
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

export interface RunAzureEvaluationResult {
  success: boolean;
  response?: LLMEvaluationResponse;
  model: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompts
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert investment analyst reviewing proposals against fund mandates.

Your task is to evaluate how well a proposal fits a fund's investment mandate and provide a structured assessment.

Guidelines:
- Be objective and thorough in your analysis
- Consider alignment with strategy, geography, and investment criteria
- Identify both strengths and potential risks
- Provide actionable recommendations
- Confidence level should reflect the quality of information provided

You MUST respond with valid JSON only, no additional text.`;

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
// Azure OpenAI API Call
// ─────────────────────────────────────────────────────────────────────────────

async function callAzureOpenAI(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  config: AzureOpenAIConfig
): Promise<{ content: string; model: string }> {
  // Azure OpenAI endpoint format:
  // {endpoint}/openai/deployments/{deployment-id}/chat/completions?api-version={api-version}
  const url = `${config.endpoint}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;

  // Safe logging - never log the API key
  console.log(`[azureOpenAIClient] Calling Azure OpenAI deployment: ${config.deploymentName}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": config.apiKey,
    },
    body: JSON.stringify({
      messages,
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Safe logging - don't expose full error which might contain sensitive info
    console.error(`[azureOpenAIClient] API error: status=${response.status}`);
    throw new Error(`Azure OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    throw new Error("Invalid Azure OpenAI response: no content in response");
  }

  return {
    content: data.choices[0].message.content,
    model: config.deploymentName,
  };
}

// Parse JSON from LLM response (handles markdown code blocks)
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

export async function runAzureEvaluationLLM(
  params: RunAzureEvaluationParams
): Promise<RunAzureEvaluationResult> {
  const { mandateText, proposalText, context, ragInput } = params;

  try {
    const config = getAzureOpenAIConfig();

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(mandateText, proposalText, context, ragInput) },
    ];

    // First attempt
    const firstResponse = await callAzureOpenAI(messages, config);

    try {
      const parsed = parseJSONResponse(firstResponse.content);
      const validation = validateLLMResponse(parsed);

      if (validation.success && validation.data) {
        console.log("[azureOpenAIClient] Evaluation successful");
        return {
          success: true,
          response: validation.data,
          model: firstResponse.model,
        };
      }

      // Invalid schema, retry with fix prompt
      console.warn("[azureOpenAIClient] First response validation failed:", validation.error);

      messages.push({ role: "assistant", content: firstResponse.content });
      messages.push({ role: "user", content: buildRetryPrompt(firstResponse.content, validation.error || "Invalid schema") });

      const retryResponse = await callAzureOpenAI(messages, config);
      const retryParsed = parseJSONResponse(retryResponse.content);
      const retryValidation = validateLLMResponse(retryParsed);

      if (retryValidation.success && retryValidation.data) {
        console.log("[azureOpenAIClient] Evaluation successful after retry");
        return {
          success: true,
          response: retryValidation.data,
          model: retryResponse.model,
        };
      }

      return {
        success: false,
        model: retryResponse.model,
        error: `Azure OpenAI response validation failed after retry: ${retryValidation.error}`,
      };

    } catch (parseError) {
      // JSON parse failed, retry with fix prompt
      console.warn("[azureOpenAIClient] JSON parse failed:", parseError);

      messages.push({ role: "assistant", content: firstResponse.content });
      messages.push({
        role: "user",
        content: buildRetryPrompt(
          firstResponse.content,
          parseError instanceof Error ? parseError.message : "Invalid JSON"
        ),
      });

      const retryResponse = await callAzureOpenAI(messages, config);

      try {
        const retryParsed = parseJSONResponse(retryResponse.content);
        const retryValidation = validateLLMResponse(retryParsed);

        if (retryValidation.success && retryValidation.data) {
          console.log("[azureOpenAIClient] Evaluation successful after retry");
          return {
            success: true,
            response: retryValidation.data,
            model: retryResponse.model,
          };
        }

        return {
          success: false,
          model: retryResponse.model,
          error: `Azure OpenAI response validation failed after retry: ${retryValidation.error}`,
        };
      } catch (retryParseError) {
        return {
          success: false,
          model: config.deploymentName,
          error: `Failed to parse Azure OpenAI response after retry: ${retryParseError instanceof Error ? retryParseError.message : "Unknown error"}`,
        };
      }
    }

  } catch (error) {
    // Safe error logging - don't expose sensitive details
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[azureOpenAIClient] Azure OpenAI evaluation failed:", errorMessage);
    return {
      success: false,
      model: process.env.AZURE_OPENAI_DEPLOYMENT || "azure-openai",
      error: errorMessage,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation Extraction (Proposal Validation Engine)
// ─────────────────────────────────────────────────────────────────────────────

import type { ValidationLLMResult } from "@/lib/evaluation/validationTypes";

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

export async function runAzureValidationExtraction(
  proposalText: string
): Promise<ValidationLLMResult | null> {
  if (!isAzureOpenAIConfigured()) return null;
  try {
    const config = getAzureOpenAIConfig();
    const messages: Array<{ role: "system" | "user"; content: string }> = [
      { role: "system", content: VALIDATION_SYSTEM_PROMPT },
      { role: "user", content: VALIDATION_USER_PROMPT(proposalText) },
    ];
    const response = await callAzureOpenAI(messages, config);
    return parseValidationResponse(response.content);
  } catch (error) {
    console.warn("[azureOpenAIClient] Validation extraction failed:", error);
    return null;
  }
}
