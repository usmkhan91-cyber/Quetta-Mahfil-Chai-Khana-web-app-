import { ToolDefinition, UserContext, UserRole, ROLE_PERMISSIONS } from './types';
import { TOOL_REGISTRY } from './registry';

export interface ValidationResult {
  isValid: boolean;
  sanitizedArgs?: Record<string, any>;
  errorCode?: string;
  errorMessage?: string;
  failureCategory?: 'VALIDATION' | 'AUTHORIZATION';
}

/**
 * Strips dangerous injection sequences and bounds string length
 */
export function sanitizeString(val: any, maxLength = 1000): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  return str.slice(0, maxLength);
}

/**
 * Validates whether an actor role has the required permissions
 */
export function validateActorPermissions(
  role: UserRole,
  requiredPermissions: string[]
): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  if (permissions.includes('*')) return true;

  return requiredPermissions.every(p => {
    if (permissions.includes(p)) return true;
    const wildcardPrefix = p.split('.')[0] + '.*';
    return permissions.includes(wildcardPrefix);
  });
}

/**
 * Authoritatively validates tool arguments against business constraints
 */
export function validateToolArguments(
  toolName: string,
  args: Record<string, any>,
  toolDef?: ToolDefinition
): ValidationResult {
  const def = toolDef || TOOL_REGISTRY[toolName];
  if (!def) {
    return {
      isValid: false,
      errorCode: 'UNKNOWN_TOOL',
      errorMessage: `Tool '${toolName}' is not registered in the system.`,
      failureCategory: 'VALIDATION'
    };
  }

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(args || {})) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value, 2000);
    } else if (typeof value === 'number') {
      if (!Number.isFinite(value) || Number.isNaN(value)) {
        return {
          isValid: false,
          errorCode: 'INVALID_NUMERIC_VALUE',
          errorMessage: `Argument '${key}' must be a finite number.`,
          failureCategory: 'VALIDATION'
        };
      }
      sanitized[key] = value;
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.slice(0, 50);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = value;
    }
  }

  // Domain-specific business constraints
  switch (toolName) {
    case 'admin_update_price': {
      const price = typeof sanitized.newPrice === 'number' ? sanitized.newPrice : sanitized.price;
      const itemName = sanitized.itemIdOrName || sanitized.name;
      if (!itemName || typeof itemName !== 'string' || itemName.length < 2) {
        return {
          isValid: false,
          errorCode: 'INVALID_ITEM_NAME',
          errorMessage: 'Valid item name or ID required.',
          failureCategory: 'VALIDATION'
        };
      }
      if (typeof price !== 'number' || price <= 0 || price > 100000) {
        return {
          isValid: false,
          errorCode: 'INVALID_PRICE_RANGE',
          errorMessage: 'Price must be a positive number between 1 and 100,000 PKR.',
          failureCategory: 'VALIDATION'
        };
      }
      sanitized.itemIdOrName = itemName;
      sanitized.newPrice = price;
      break;
    }

    case 'create_reservation': {
      if (sanitized.guests !== undefined) {
        const guests = Number(sanitized.guests);
        if (Number.isNaN(guests) || guests < 1 || guests > 50) {
          return {
            isValid: false,
            errorCode: 'INVALID_GUESTS_COUNT',
            errorMessage: 'Party size must be between 1 and 50 guests.',
            failureCategory: 'VALIDATION'
          };
        }
        sanitized.guests = Math.floor(guests);
      }
      break;
    }

    case 'calculate_order_quote':
    case 'create_order': {
      if (sanitized.items && !Array.isArray(sanitized.items)) {
        return {
          isValid: false,
          errorCode: 'INVALID_ORDER_ITEMS',
          errorMessage: 'Items must be a valid array of ordered dishes.',
          failureCategory: 'VALIDATION'
        };
      }
      break;
    }

    case 'submit_support_ticket': {
      if (!sanitized.subject || !sanitized.message) {
        return {
          isValid: false,
          errorCode: 'MISSING_TICKET_DETAILS',
          errorMessage: 'Support tickets require both a subject and message.',
          failureCategory: 'VALIDATION'
        };
      }
      break;
    }
  }

  return {
    isValid: true,
    sanitizedArgs: sanitized
  };
}
