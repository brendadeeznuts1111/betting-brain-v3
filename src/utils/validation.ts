/**
 * Validation Utilities
 * Comprehensive input validation and sanitization
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: any;
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => string | null;
}

/**
 * Validate input against rules
 */
export function validateInput(data: any, rules: ValidationRule[]): ValidationResult {
  const errors: string[] = [];
  const sanitized: any = {};

  for (const rule of rules) {
    const value = data[rule.field];
    
    // Check required
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${rule.field} is required`);
      continue;
    }

    // Skip validation if field is optional and not provided
    if (!rule.required && (value === undefined || value === null)) {
      continue;
    }

    // Type validation
    if (rule.type) {
      const typeError = validateType(rule.field, value, rule.type);
      if (typeError) {
        errors.push(typeError);
        continue;
      }
    }

    // Numeric range validation
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${rule.field} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${rule.field} must be at most ${rule.max}`);
      }
    }

    // String length validation
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push(`${rule.field} must be at most ${rule.maxLength} characters`);
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${rule.field} has invalid format`);
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${rule.field} must be one of: ${rule.enum.join(', ')}`);
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        errors.push(customError);
      }
    }

    // Add sanitized value
    sanitized[rule.field] = sanitizeValue(value, rule.type);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined
  };
}

function validateType(field: string, value: any, expectedType: string): string | null {
  switch (expectedType) {
    case 'string':
      if (typeof value !== 'string') {
        return `${field} must be a string`;
      }
      break;
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return `${field} must be a number`;
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        return `${field} must be a boolean`;
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        return `${field} must be an array`;
      }
      break;
    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return `${field} must be an object`;
      }
      break;
    case 'date':
      if (!(value instanceof Date) && isNaN(Date.parse(value))) {
        return `${field} must be a valid date`;
      }
      break;
  }
  return null;
}

function sanitizeValue(value: any, type?: string): any {
  if (value === null || value === undefined) {
    return value;
  }

  switch (type) {
    case 'string':
      return String(value).trim();
    case 'number':
      return Number(value);
    case 'boolean':
      return Boolean(value);
    case 'date':
      return new Date(value);
    default:
      return value;
  }
}

/**
 * Common validation patterns
 */
export const Validators = {
  agentID: (required = true): ValidationRule => ({
    field: 'agentID',
    required,
    type: 'string',
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9_-]+$/
  }),

  customerID: (required = false): ValidationRule => ({
    field: 'customerID',
    required,
    type: 'string',
    minLength: 1,
    maxLength: 100
  }),

  eventID: (required = false): ValidationRule => ({
    field: 'eventID',
    required,
    type: 'string',
    minLength: 1,
    maxLength: 100
  }),

  marketType: (required = false): ValidationRule => ({
    field: 'marketType',
    required,
    type: 'string',
    enum: ['MONEYLINE', 'SPREAD', 'TOTAL', 'PROP', 'FUTURE', 'PARLAY']
  }),

  sport: (required = false): ValidationRule => ({
    field: 'sport',
    required,
    type: 'string',
    enum: ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER', 'MMA', 'BOXING', 'TENNIS', 'GOLF']
  }),

  date: (field: string, required = false): ValidationRule => ({
    field,
    required,
    type: 'string',
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    custom: (value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return `${field} must be a valid date (YYYY-MM-DD)`;
      }
      return null;
    }
  }),

  limit: (max = 1000): ValidationRule => ({
    field: 'limit',
    required: false,
    type: 'number',
    min: 1,
    max
  }),

  offset: (): ValidationRule => ({
    field: 'offset',
    required: false,
    type: 'number',
    min: 0
  }),

  threshold: (min: number, max: number): ValidationRule => ({
    field: 'threshold',
    required: false,
    type: 'number',
    min,
    max
  }),

  exposureLevel: (): ValidationRule => ({
    field: 'exposureLevel',
    required: false,
    type: 'string',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  }),

  groupBy: (): ValidationRule => ({
    field: 'groupBy',
    required: false,
    type: 'string',
    enum: ['event', 'market', 'customer', 'sport']
  })
};

/**
 * Validate query parameters from URL
 */
export function validateQueryParams(url: URL, rules: ValidationRule[]): ValidationResult {
  const data: any = {};
  
  for (const rule of rules) {
    const value = url.searchParams.get(rule.field);
    
    if (value !== null) {
      // Convert to appropriate type
      if (rule.type === 'number') {
        data[rule.field] = Number(value);
      } else if (rule.type === 'boolean') {
        data[rule.field] = value === 'true' || value === '1';
      } else {
        data[rule.field] = value;
      }
    }
  }

  return validateInput(data, rules);
}

/**
 * Validate JSON body
 */
export async function validateJSONBody(request: Request, rules: ValidationRule[]): Promise<ValidationResult> {
  try {
    const body = await request.json() as Record<string, unknown>;
    return validateInput(body, rules);
  } catch (error) {
    return {
      valid: false,
      errors: ['Invalid JSON body']
    };
  }
}

/**
 * Create validation error response
 */
export function validationErrorResponse(errors: string[], requestId?: string): Response {
  return new Response(JSON.stringify({
    error: 'Validation Error',
    errors,
    requestId,
    timestamp: new Date().toISOString()
  }), {
    status: 400,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
