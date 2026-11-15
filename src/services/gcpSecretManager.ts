export interface SecretManagerConfig {
  projectId?: string;
  secretName?: string;
}

export function getGcpProjectId(): string | undefined {
  return process.env.GOOGLE_CLOUD_PROJECT_ID ?? process.env.GCP_PROJECT_ID ?? process.env.GCP_PROJECT ?? undefined;
}

export function getGcpSecretName(): string | undefined {
  return process.env.GOOGLE_CLOUD_SECRET_NAME ?? process.env.GEMINI_SECRET_NAME ?? process.env.GCP_SECRET_NAME ?? undefined;
}

export async function readSecretValue(secretName: string, projectId?: string): Promise<string | undefined> {
  const resolvedProjectId = projectId ?? getGcpProjectId();
  if (!resolvedProjectId || !secretName) {
    return undefined;
  }

  try {
    const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({
      name: `projects/${resolvedProjectId}/secrets/${secretName}/versions/latest`
    });

    return version.payload?.data?.toString() ?? undefined;
  } catch (error) {
    console.warn('GCP Secret Manager read failed:', error instanceof Error ? error.message : error);
    return undefined;
  }
}

export async function resolveGoogleCloudApiKey(): Promise<string | undefined> {
  const envValue = process.env.GOOGLE_CLOUD_API_KEY ?? process.env.GEMINI_API_KEY ?? '';
  if (envValue.trim()) {
    return envValue.trim();
  }

  const configuredSecretName = getGcpSecretName();
  if (!configuredSecretName) {
    return undefined;
  }

  return readSecretValue(configuredSecretName, getGcpProjectId());
}
