import "server-only";

// LLM Validation Extraction Client
//
// Extracts validation signals from proposal text: stage, business model clarity,
// competitor presence. Routes to Azure OpenAI or standard OpenAI.

import {
  isAzureOpenAIConfigured,
  runAzureValidationExtraction,
} from "./azureOpenAIClient";
import { runOpenAIValidationExtraction } from "./openaiClient";
import { isLLMConfigured } from "./openaiClient";
import type { ValidationLLMResult } from "@/lib/evaluation/validationTypes";

export { isLLMConfigured };

export async function runValidationExtractionWithProvider(
  proposalText: string
): Promise<ValidationLLMResult | null> {
  if (isAzureOpenAIConfigured()) {
    return runAzureValidationExtraction(proposalText);
  }
  return runOpenAIValidationExtraction(proposalText);
}
