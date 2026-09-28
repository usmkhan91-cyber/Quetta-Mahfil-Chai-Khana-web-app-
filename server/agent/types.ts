import { FunctionDeclaration } from '@google/genai';

export type UserRole = 'anonymous' | 'guest' | 'customer' | 'kitchen' | 'staff' | 'manager' | 'admin' | 'superadmin';

export type ToolCategory =
  | 'CUSTOMER_INFO'
  | 'CUSTOMER_ACCOUNT'
  | 'ORDER'
  | 'RESERVATION'
  | 'SUPPORT'
  | 'NOTIFICATION'
  | 'LOYALTY'
  | 'RESTAURANT_OPERATIONS'
  | 'ADMIN'
  | 'KITCHEN'
  | 'DISPATCH'
  | 'ADMIN_CONFIG'
  | 'AI'
  | 'SUPER_ADMIN';

export type RiskLevel = 'READ_ONLY' | 'LOW_RISK_WRITE' | 'HIGH_RISK_WRITE' | 'CRITICAL_ADMIN';
export type RateLimitTier = 'standard' | 'strict' | 'privileged';
export type OwnershipScope = 'public' | 'user' | 'order' | 'system';
export type ToolImplementationStatus =
  | 'IMPLEMENTED'
  | 'PARTIALLY_IMPLEMENTED'
  | 'REQUIRES_EXTERNAL_SERVICE'
  | 'NOT_IMPLEMENTED';

export interface UserContext {
  userId?: string;
  userUid?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  isEmailVerified?: boolean;
  preferences?: string;
  cart?: Array<{ name: string; quantity: number; price?: number }>;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AgentInteractionPayload {
  message: string;
  modality?: 'text' | 'voice';
  history?: AgentMessage[];
  context?: UserContext;
}

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  failureCategory?: 'VALIDATION' | 'AUTHORIZATION' | 'AVAILABILITY' | 'EXECUTION' | 'TIMEOUT' | 'RETRYABLE' | 'NON_RETRYABLE';
  isRetryable?: boolean;
  correlationId?: string;
  durationMs?: number;
  userSafeMessage?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  confirmationRequired?: boolean;
  [key: string]: any;
}

export interface ToolDefinition {
  id: string; // Unique Tool ID (e.g. 'tool_customer_search_menu')
  name: string;
  toolName?: string;
  category: ToolCategory | 'READ' | 'WRITE' | 'ADMIN' | 'SUPER_ADMIN';
  purpose: string;
  description: string;
  version: string;
  status: ToolImplementationStatus;
  statusReason?: string;
  parameters: FunctionDeclaration['parameters'];
  inputSchema?: string;
  outputSchema?: string;
  requiresAuth: boolean;
  allowedRoles: UserRole[];
  allowedActorTypes?: Array<'guest' | 'customer' | 'kitchen' | 'staff' | 'manager' | 'admin' | 'superadmin'>;
  requiredPermissions: string[];
  requiresConfirmation: boolean;
  supportsIdempotency: boolean;
  riskLevel: RiskLevel;
  rateLimit: RateLimitTier;
  rateLimitClass: RateLimitTier;
  auditRequired: boolean;
  enabled: boolean;
  timeoutMs: number;
  retryPolicy: { maxRetries: number; retryable: boolean };
  destructive: boolean;
  sensitiveData: boolean;
  ownershipScope: OwnershipScope;
  handler?: (args: any, context?: UserContext, options?: { requestId?: string; correlationId?: string }) => Promise<ToolResult> | ToolResult;
}

export interface ToolMetrics {
  toolName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  lastExecutedAt?: string;
  lastStatus?: 'SUCCESS' | 'DENIED' | 'FAILED' | 'CONFIRMATION_REQUIRED';
  averageDurationMs?: number;
}

export interface ExternalServiceAdapter {
  name: string;
  category: 'PAYMENT_GATEWAY' | 'GPS_TELEMETRY' | 'SMS_WHATSAPP' | 'ACCOUNTING';
  configured: boolean;
  status: 'CONFIGURED' | 'REQUIRES_EXTERNAL_SERVICE' | 'ERROR';
  description: string;
  lastHealthCheck?: string;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  executedBy: string;
  actorUid?: string;
  actorRole?: string;
  target?: string;
  toolName?: string;
  correlationId?: string;
  durationMs?: number;
  failureCategory?: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  riskLevel?: RiskLevel;
  details: any;
  timestamp: string;
}

// Granular least-privilege permissions assigned per role
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  superadmin: ['*'],
  admin: [
    'restaurant.read', 'menu.read', 'menu.write', 'orders.read', 'orders.write', 'orders.cancel', 'orders.create',
    'reservations.read', 'reservations.write', 'reservations.cancel', 'reservations.create', 'customers.read', 'customers.write',
    'notifications.send', 'loyalty.manage', 'kitchen.read', 'kitchen.write', 'dispatch.read',
    'dispatch.write', 'reports.read', 'audit.read', 'configuration.read', 'configuration.write', 'admin.manage',
    'support.read', 'support.write'
  ],
  manager: [
    'restaurant.read', 'menu.read', 'menu.write', 'orders.read', 'orders.write', 'orders.status', 'orders.cancel', 'orders.create',
    'reservations.read', 'reservations.write', 'reservations.cancel', 'reservations.create',
    'kitchen.read', 'kitchen.write', 'dispatch.read', 'dispatch.write', 'reports.read', 'customers.read', 'support.read', 'support.write'
  ],
  staff: [
    'restaurant.read', 'menu.read', 'orders.read', 'orders.write', 'orders.status', 'orders.create', 'orders.cancel',
    'reservations.read', 'reservations.write', 'reservations.cancel', 'reservations.create', 'kitchen.read', 'kitchen.write', 'dispatch.read',
    'dispatch.write', 'reports.read', 'support.read'
  ],
  kitchen: [
    'restaurant.read', 'menu.read', 'orders.read', 'kitchen.read', 'kitchen.write', 'menu.availability'
  ],
  customer: [
    'restaurant.read', 'menu.read', 'orders.read', 'orders.create', 'orders.cancel',
    'reservations.read', 'reservations.create', 'reservations.cancel',
    'profile.read', 'profile.write', 'memory.read', 'memory.write', 'loyalty.read', 'support.write', 'support.read'
  ],
  guest: [
    'restaurant.read', 'menu.read', 'orders.read', 'orders.create', 'reservations.read', 'reservations.create', 'reservations.cancel', 'support.write'
  ],
  anonymous: [
    'restaurant.read', 'menu.read', 'orders.read', 'orders.create', 'reservations.read', 'reservations.create', 'reservations.cancel'
  ]
};
