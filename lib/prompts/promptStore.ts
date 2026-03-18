// In-memory prompt store (replace with DB in production)

export interface PromptVersion {
  id: string;
  content: string;
  savedAt: string;
}

export interface StoredPrompt {
  content: string;
  versions: PromptVersion[];
}

const promptStore = new Map<string, StoredPrompt>();

export function getStoreKey(tenantId: string, key: string, fundId?: string): string {
  return fundId ? `${tenantId}:${key}:${fundId}` : `${tenantId}:${key}`;
}

export function getPrompt(tenantId: string, key: string, fundId?: string): StoredPrompt | undefined {
  return promptStore.get(getStoreKey(tenantId, key, fundId));
}

export function setPrompt(
  tenantId: string,
  key: string,
  content: string,
  fundId?: string
): { savedAt: string } {
  const sk = getStoreKey(tenantId, key, fundId);
  const existing = promptStore.get(sk) ?? { content: "", versions: [] };
  const versions = [...existing.versions];
  versions.push({
    id: `v${versions.length + 1}`,
    content,
    savedAt: new Date().toISOString(),
  });
  if (versions.length > 20) versions.shift();

  const savedAt = new Date().toISOString();
  promptStore.set(sk, { content, versions });
  return { savedAt };
}

export function getVersions(tenantId: string, key: string, fundId?: string): PromptVersion[] {
  const stored = promptStore.get(getStoreKey(tenantId, key, fundId));
  return stored?.versions ?? [];
}
