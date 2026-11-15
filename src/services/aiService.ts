import { getAiModelById } from '../config/ai.js';
import type { AiConfig } from '../domain.js';
import { GoogleCloudAiAdapter, type AiExecutionRequest, type AiExecutionResult, type AiValidationResult } from './googleCloudAiAdapter.js';

export class AiService {
  constructor(private readonly adapter: GoogleCloudAiAdapter = new GoogleCloudAiAdapter()) {}

  validateConfig(config: Partial<AiConfig>): AiValidationResult {
    return this.adapter.validateConfig(config);
  }

  async execute(request: AiExecutionRequest, config: Partial<AiConfig>): Promise<AiExecutionResult> {
    const selectedModelId = request.modelId ?? config.modelId ?? '';

    if (!selectedModelId) {
      return {
        ok: false,
        provider: 'google-cloud',
        model: '',
        operation: request.operation,
        status: 'invalid',
        message: 'AI model id is required before execution.'
      };
    }

    if (!getAiModelById(selectedModelId)) {
      return {
        ok: false,
        provider: 'google-cloud',
        model: selectedModelId,
        operation: request.operation,
        status: 'invalid',
        message: `AI model '${selectedModelId}' is not available in the Google Cloud registry.`
      };
    }

    if (config.enabled === false) {
      return {
        ok: false,
        provider: 'google-cloud',
        model: selectedModelId,
        operation: request.operation,
        status: 'disabled',
        message: 'AI execution is disabled in the admin configuration.'
      };
    }

    return this.adapter.execute(request, config);
  }
}

export function createAiService(adapter: GoogleCloudAiAdapter = new GoogleCloudAiAdapter()): AiService {
  return new AiService(adapter);
}
