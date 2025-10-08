/**
 * JWT Validation Utilities
 *
 * Lightweight JWT validation using Web Crypto API
 * No external dependencies required
 */

export interface JWTPayload {
  sub?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

/**
 * Validate JWT token signature and expiry
 *
 * @param token - JWT token string
 * @param secret - Secret key for HMAC validation
 * @returns true if valid, false otherwise
 */
export async function validateJWT(
  token: string | undefined,
  secret: string
): Promise<boolean> {
  if (!token) return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode payload and check expiry
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload: JWTPayload = JSON.parse(payloadJson);

    // Check expiry (if present)
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }

    // Verify signature using HMAC-SHA256
    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const keyData = encoder.encode(secret);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);

    // Convert signature to base64url
    const signatureArray = new Uint8Array(signature);
    const expectedSignature = btoa(String.fromCharCode(...signatureArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return expectedSignature === signatureB64;
  } catch (error) {
    console.error('JWT validation error:', error);
    return false;
  }
}

/**
 * Create a simple JWT token (for testing)
 *
 * @param payload - Payload data
 * @param secret - Secret key
 * @param expiresInSeconds - Expiration time in seconds (default: 3600)
 * @returns JWT token string
 */
export async function createJWT(
  payload: JWTPayload,
  secret: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const payloadB64 = btoa(JSON.stringify(fullPayload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const encoder = new TextEncoder();
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const keyData = encoder.encode(secret);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  const signatureArray = new Uint8Array(signature);
  const signatureB64 = btoa(String.fromCharCode(...signatureArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}
