import { getAiModelById, getGoogleCloudApiKey, getGoogleCloudModelOverride, isGoogleCloudEnabledByEnv } from '../config/ai.js';
import type { AiConfig } from '../domain.js';
import { resolveGoogleCloudApiKey } from './gcpSecretManager.js';

export type AiOperation = 'classification' | 'crop' | 'generation';

export interface AiExecutionRequest {
  operation: AiOperation;
  modelId: string;
  prompt?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface AiExecutionResult {
  ok: boolean;
  provider: 'google-cloud';
  model: string;
  operation: AiOperation;
  status: 'disabled' | 'invalid' | 'not-configured' | 'stubbed' | 'success' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

export interface AiValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  provider: 'google-cloud';
  selectedModel?: string;
}

function resolveModelId(requestModelId: string | undefined, configModelId?: string): string {
  return getGoogleCloudModelOverride() ?? requestModelId ?? configModelId ?? 'gemini-1.5-flash';
}

function buildPrompt(operation: AiOperation, request: AiExecutionRequest): string {
  const baseText = request.prompt ?? 'Analyze the uploaded clothing item for styling recommendations.';
  const metadata = request.metadata ? `\nContext: ${JSON.stringify(request.metadata)}` : '';
  const imageText = request.imageUrl ? `\nImage URL: ${request.imageUrl}` : '';

  switch (operation) {
    case 'classification':
      return `Classify this clothing item. Return a compact JSON object with category, color, season, event, and confidence. ${baseText}${imageText}${metadata}`;
    case 'crop':
      return `Suggest crop bounds and framing for this clothing item. Return JSON with x, y, width, height, and rationale. ${baseText}${imageText}${metadata}`;
    case 'generation':
      return `Generate one concise styling recommendation based on this item and the metadata. ${baseText}${imageText}${metadata}`;
    default:
      return `${baseText}${imageText}${metadata}`;
  }
}

function parseStructuredAiResponse(operation: AiOperation, summary: string): Record<string, unknown> {
  const trimmed = summary.trim();
  const match = trimmed.match(/```json\s*([\s\S]*?)```/i) ?? trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  const candidate = match ? (match[1] ?? match[0]) : trimmed;

  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    if (operation === 'classification') {
      return { classification: parsed, summary: trimmed };
    }

    if (operation === 'crop') {
      return { crop: parsed, summary: trimmed };
    }

    return { generation: parsed, summary: trimmed };
  } catch {
    return { summary: trimmed };
  }
}

export class GoogleCloudAiAdapter {
  validateConfig(config: Partial<AiConfig>): AiValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.provider && config.provider !== 'google-cloud') {
      errors.push('Only the Google Cloud provider is supported in this project.');
    }

    const selectedModel = resolveModelId(config.modelId, config.modelId);

    if (!selectedModel) {
      errors.push('AI model id is required.');
    } else if (!getAiModelById(selectedModel)) {
      errors.push(`AI model '${selectedModel}' is not present in the supported Google Cloud model registry.`);
    }

    if (config.enabled === false) {
      warnings.push('AI execution is disabled in config, so the adapter will not run.');
    }

    const apiKeyConfigured = Boolean(config.apiKeyConfigured ?? getGoogleCloudApiKey());
    if (!apiKeyConfigured) {
      warnings.push('Google Cloud API key is not configured. Execution stays in safe stub mode until connection is completed.');
    }

    if (config.enabled === true && !apiKeyConfigured && isGoogleCloudEnabledByEnv() === false) {
      warnings.push('The environment is not explicitly enabled for Google Cloud execution, so runtime calls remain blocked.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      provider: 'google-cloud',
      selectedModel
    };
  }

  async execute(request: AiExecutionRequest, config: Partial<AiConfig>): Promise<AiExecutionResult> {
    const validation = this.validateConfig(config);
    const selectedModel = resolveModelId(request.modelId, config.modelId);

    if (config.enabled === false) {
      return {
        ok: false,
        provider: 'google-cloud',
        model: selectedModel,
        operation: request.operation,
        status: 'disabled',
        message: 'AI execution is disabled in the admin configuration.'
      };
    }

    if (!validation.valid) {
      return {
        ok: false,
        provider: 'google-cloud',
        model: selectedModel,
        operation: request.operation,
        status: 'invalid',
        message: validation.errors.join(' ')
      };
    }

    const apiKey = getGoogleCloudApiKey() ?? (await resolveGoogleCloudApiKey());
    if (!apiKey) {
      return {
        ok: false,
        provider: 'google-cloud',
        model: selectedModel,
        operation: request.operation,
        status: 'not-configured',
        message: 'Google Cloud API key is not configured. The adapter has been blocked in safe mode.'
      };
    }

    const model = selectedModel;
    const modelDefinition = getAiModelById(model) ?? getAiModelById('gemini-1.5-flash');

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const body = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: buildPrompt(request.operation, request) }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const errorText = payload?.error?.message ?? 'Google Cloud request failed';
        return {
          ok: false,
          provider: 'google-cloud',
          model,
          operation: request.operation,
          status: 'error',
          message: `Google Cloud request failed: ${errorText}`
        };
      }

      const responseData = await response.json() as Record<string, unknown>;
      const messageText = ((responseData?.candidates as Array<Record<string, unknown>> | undefined)?.[0]?.content as Record<string, unknown> | undefined)?.parts as Array<Record<string, unknown>> | undefined;
      const summary = (messageText ?? [])
        .map((part) => typeof part?.text === 'string' ? part.text : '')
        .filter(Boolean)
        .join('\n') || 'Google Cloud request completed successfully.';
      const structuredData = parseStructuredAiResponse(request.operation, summary);

      return {
        ok: true,
        provider: 'google-cloud',
        model: modelDefinition?.model ?? model,
        operation: request.operation,
        status: 'success',
        message: 'Google Cloud Gemini request completed successfully.',
        data: {
          ...structuredData,
          summary,
          raw: responseData,
          imageUrl: request.imageUrl ?? '',
          capabilities: modelDefinition?.capabilities ?? [],
          provider: 'google-cloud'
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Google Cloud adapter error';
      return {
        ok: false,
        provider: 'google-cloud',
        model,
        operation: request.operation,
        status: 'error',
        message: `Google Cloud adapter failed: ${message}`
      };
    }
  }
}
