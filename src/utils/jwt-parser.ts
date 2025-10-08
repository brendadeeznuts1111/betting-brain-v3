// JWT Token Parser Utility
// Decodes and validates JWT tokens from Fantasy402.com

export interface JWTClaims {
  sub?: string;      // Subject (user ID, e.g., "BILLY666")
  type?: number;     // User type
  ag?: string;       // Agent
  imp?: string;      // Impersonator
  off?: string;      // Office (e.g., "NOLAROSE")
  rb?: any;          // Unknown
  nbf?: number;      // Not Before timestamp
  exp?: number;      // Expiration timestamp
}

export interface ParsedJWT {
  header: any;
  claims: JWTClaims;
  signature: string;
  raw: string;
  expiresAt: string | null;
  isExpired: boolean;
}

/**
 * Parse a JWT token without verification
 * (We don't have the secret, just extracting claims)
 */
export function parseJWT(token: string): ParsedJWT | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }
    
    // Decode header and payload (base64url)
    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    const claims = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    // Extract expiration
    let expiresAt: string | null = null;
    let isExpired = false;
    
    if (claims.exp) {
      const expDate = new Date(claims.exp * 1000);
      expiresAt = expDate.toISOString();
      isExpired = Date.now() / 1000 > claims.exp;
    }
    
    return {
      header,
      claims,
      signature: parts[2],
      raw: token,
      expiresAt,
      isExpired
    };
    
  } catch (error) {
    console.error('JWT parsing error:', error);
    return null;
  }
}

/**
 * Extract JWT token from Authorization header
 */
export function extractBearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Get user-friendly token info
 */
export function getTokenInfo(token: string): {
  userID: string | null;
  office: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  valid: boolean;
} {
  const parsed = parseJWT(token);
  
  if (!parsed) {
    return {
      userID: null,
      office: null,
      expiresAt: null,
      isExpired: true,
      valid: false
    };
  }
  
  return {
    userID: parsed.claims.sub || null,
    office: parsed.claims.off || null,
    expiresAt: parsed.expiresAt,
    isExpired: parsed.isExpired,
    valid: !parsed.isExpired
  };
}

/**
 * Extract all JWT tokens from request
 */
export function extractAllTokens(
  authHeader: string | null | undefined,
  bodyParams: Record<string, any> | null
): string[] {
  const tokens: string[] = [];
  
  // From Authorization header
  const bearerToken = extractBearerToken(authHeader);
  if (bearerToken) {
    tokens.push(bearerToken);
  }
  
  // From body (common in Fantasy402.com requests)
  if (bodyParams?.token && typeof bodyParams.token === 'string') {
    // Remove 'Bearer ' prefix if present
    const bodyToken = bodyParams.token.replace(/^Bearer\s+/i, '');
    if (bodyToken && !tokens.includes(bodyToken)) {
      tokens.push(bodyToken);
    }
  }
  
  return tokens;
}

