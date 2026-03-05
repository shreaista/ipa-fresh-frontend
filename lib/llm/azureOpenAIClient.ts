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
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview",
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

export interface RunAzureEvaluationParams {
  mandateText: string;
  proposalText: string;
  context: {
    proposalId: string;
    fundName: string;
    mandateKey: string | null;
  };
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
  context: { proposalId: string; fundName: string; mandateKey: string | null }
): string {
  return `## Fund Mandate
${mandateText || "No mandate template content available."}

## Proposal (ID: ${context.proposalId}, Fund: ${context.fundName})
${proposalText || "No proposal document content available."}

## Required Output Format (JSON)
Respond with a JSON object matching this exact schema:
{
  "fitScore": <number 0-100, where 100 is perfect fit>,
  "mandateSummary": "<1-2 sentence summary of the mandate's key requirements>",
  "proposalSummary": "<1-2 sentence summary of what the proposal is asking for>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "risks": ["<risk 1>", "<risk 2>", ...],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...],
  "confidence": "<'low' | 'medium' | 'high' - based on information quality>"
}

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
  "confidence": "<'low' | 'medium' | 'high'>"
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
  const { mandateText, proposalText, context } = params;

  try {
    const config = getAzureOpenAIConfig();

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(mandateText, proposalText, context) },
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
