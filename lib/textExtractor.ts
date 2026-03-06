import "server-only";

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

/**
 * Extracts text content from DOCX files using mammoth.
 * @param buffer - The file buffer containing DOCX data
 * @returns The extracted plain text content
 */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Extracts text content from PDF files using pdf-parse.
 * @param buffer - The file buffer containing PDF data
 * @returns The extracted plain text content
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text;
}

/**
 * Determines the file extension from a filename or path.
 * @param filename - The filename or path to extract extension from
 * @returns The lowercase file extension including the dot (e.g., ".pdf", ".docx")
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.substring(lastDot).toLowerCase();
}

/**
 * Extracts text from a buffer based on the file extension.
 * @param buffer - The file buffer
 * @param filename - The filename to determine the extraction method
 * @returns The extracted text content
 * @throws Error if the file type is not supported
 */
export async function extractTextByExtension(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const extension = getFileExtension(filename);

  switch (extension) {
    case ".pdf":
      return extractPdfText(buffer);
    case ".docx":
      return extractDocxText(buffer);
    case ".doc":
      throw new Error(
        "Legacy .doc format is not supported. Please convert to .docx"
      );
    default:
      throw new Error(`Unsupported file extension: ${extension}`);
  }
}
