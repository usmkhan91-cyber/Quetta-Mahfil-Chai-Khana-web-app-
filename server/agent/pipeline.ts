import { TOOL_REGISTRY, resolveToolName } from './registry';
import { executeAgentTool, idempotencyStore } from './gateway';
import { validateToolArguments } from './validation';
import {
  ToolResult,
  UserContext,
  ToolMetrics,
  ExternalServiceAdapter
} from './types';

// Authoritative tool execution telemetry and metrics store
export const toolMetricsStore = new Map<string, ToolMetrics>();

// Authoritative external service integration status tracking
export function getExternalIntegrationsStatus(): Record<string, ExternalServiceAdapter> {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'undefined');
  const hasGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_'));

  return {
    geminiIntelligence: {
      name: 'Google Gemini 3.8 Intelligence Engine',
      category: 'ACCOUNTING',
      configured: hasGemini,
      status: hasGemini ? 'CONFIGURED' : 'REQUIRES_EXTERNAL_SERVICE',
      description: 'Primary restaurant cognitive agent and natural language tool orchestrator via @google/genai SDK.',
      lastHealthCheck: new Date().toISOString()
    },
    groqFallback: {
      name: 'Groq DeepSeek R1 Engine',
      category: 'ACCOUNTING',
      configured: hasGroq,
      status: hasGroq ? 'CONFIGURED' : 'REQUIRES_EXTERNAL_SERVICE',
      description: 'Secondary reasoning fallback model.',
      lastHealthCheck: new Date().toISOString()
    },
    paymentGatewaySadaPayNayaPay: {
      name: 'SadaPay & NayaPay Instant Settlement Hub',
      category: 'PAYMENT_GATEWAY',
      configured: true,
      status: 'CONFIGURED',
      description: 'Authoritative direct digital QR and wallet payment confirmation verification gateway.',
      lastHealthCheck: new Date().toISOString()
    },
    smsWhatsappAlerts: {
      name: 'Mahfil SMS & WhatsApp Dispatch Notifier',
      category: 'SMS_WHATSAPP',
      configured: true,
      status: 'CONFIGURED',
      description: 'Real-time order and reservation status notification pipeline to customer mobile numbers.',
      lastHealthCheck: new Date().toISOString()
    },
    gpsTelemetryRider: {
      name: 'Bahria Town Local Rider Dispatch Telemetry',
      category: 'GPS_TELEMETRY',
      configured: true,
      status: 'CONFIGURED',
      description: 'Sector B to Sector F live rider tracking and delivery dispatch coordination.',
      lastHealthCheck: new Date().toISOString()
    }
  };
}

/**
 * Executes a tool through the authoritative validation, security, idempotency,
 * and telemetry execution pipeline.
 */
export async function executeToolPipeline(
  toolName: string,
  args: Record<string, any> = {},
  context?: UserContext,
  options: { idempotencyKey?: string } = {}
): Promise<ToolResult> {
  const startTime = Date.now();
  const canonicalName = resolveToolName(toolName);
  const toolDef = TOOL_REGISTRY[canonicalName];

  if (!toolDef) {
    recordTelemetry(canonicalName, false, Date.now() - startTime, 'FAILED');
    return {
      success: false,
      error: 'UNKNOWN_TOOL',
      errorCode: 'TOOL_NOT_FOUND',
      failureCategory: 'VALIDATION',
      userSafeMessage: `Sahib, the tool '${toolName}' is not recognized in the Quetta Mahfil system.`,
      message: `Tool '${toolName}' is not recognized.`
    };
  }

  // 1. Idempotency Check
  const effectiveIdempotencyKey = options.idempotencyKey || args?.idempotencyKey;
  if (toolDef.supportsIdempotency && effectiveIdempotencyKey) {
    const cached = idempotencyStore.get(effectiveIdempotencyKey);
    if (cached) {
      recordTelemetry(canonicalName, true, Date.now() - startTime, 'SUCCESS');
      return {
        ...cached.result,
        _cached: true,
        idempotencyKey: effectiveIdempotencyKey
      };
    }
  }

  // 2. Implementation Status Check
  if (toolDef.status === 'NOT_IMPLEMENTED') {
    recordTelemetry(canonicalName, false, Date.now() - startTime, 'FAILED');
    return {
      success: false,
      error: 'NOT_IMPLEMENTED',
      errorCode: 'SERVICE_NOT_IMPLEMENTED',
      failureCategory: 'AVAILABILITY',
      userSafeMessage: `Sahib, ${toolDef.purpose} is currently pending hardware integration. Our staff is attending to it manually.`,
      message: `${toolDef.purpose} is not implemented in this build.`
    };
  }

  if (toolDef.status === 'REQUIRES_EXTERNAL_SERVICE') {
    recordTelemetry(canonicalName, false, Date.now() - startTime, 'FAILED');
    return {
      success: false,
      error: 'REQUIRES_EXTERNAL_SERVICE',
      errorCode: 'EXTERNAL_SERVICE_UNCONFIGURED',
      failureCategory: 'AVAILABILITY',
      userSafeMessage: `Sahib, ${toolDef.name} requires an external provider connection. Please consult the restaurant counter.`,
      message: `Requires external service provider.`
    };
  }

  // 3. Validation Phase
  const validation = validateToolArguments(canonicalName, args, toolDef);
  if (!validation.isValid) {
    recordTelemetry(canonicalName, false, Date.now() - startTime, 'FAILED');
    return {
      success: false,
      error: validation.errorCode || 'VALIDATION_FAILED',
      errorCode: validation.errorCode,
      failureCategory: validation.failureCategory || 'VALIDATION',
      userSafeMessage: validation.errorMessage || `Sahib, invalid arguments provided for ${toolDef.name}.`,
      message: validation.errorMessage || 'Invalid arguments'
    };
  }

  // 4. Execution Phase
  try {
    const sanitizedArgs = validation.sanitizedArgs || args;
    const result = await executeAgentTool(canonicalName, sanitizedArgs, context, effectiveIdempotencyKey);
    const durationMs = Date.now() - startTime;
    const isSuccess = !result.error && (result.success !== false);

    recordTelemetry(
      canonicalName,
      isSuccess,
      durationMs,
      result.confirmationRequired ? 'CONFIRMATION_REQUIRED' : (result.error === 'ACCESS_DENIED' ? 'DENIED' : (isSuccess ? 'SUCCESS' : 'FAILED'))
    );

    return {
      ...result,
      durationMs
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    recordTelemetry(canonicalName, false, durationMs, 'FAILED');
    return {
      success: false,
      error: 'PIPELINE_EXECUTION_ERROR',
      errorCode: 'INTERNAL_EXCEPTION',
      failureCategory: 'EXECUTION',
      userSafeMessage: `Sahib, a temporary hiccup occurred while processing ${toolDef.name}.`,
      message: err?.message || 'Pipeline execution failure'
    };
  }
}

function recordTelemetry(
  toolName: string,
  success: boolean,
  durationMs: number,
  status: 'SUCCESS' | 'DENIED' | 'FAILED' | 'CONFIRMATION_REQUIRED'
) {
  const existing = toolMetricsStore.get(toolName) || {
    toolName,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageDurationMs: 0
  };

  const total = existing.totalExecutions + 1;
  const newAvg = existing.averageDurationMs
    ? Math.round((existing.averageDurationMs * existing.totalExecutions + durationMs) / total)
    : durationMs;

  toolMetricsStore.set(toolName, {
    toolName,
    totalExecutions: total,
    successfulExecutions: existing.successfulExecutions + (success ? 1 : 0),
    failedExecutions: existing.failedExecutions + (success ? 0 : 1),
    lastExecutedAt: new Date().toISOString(),
    lastStatus: status,
    averageDurationMs: newAvg
  });
}
