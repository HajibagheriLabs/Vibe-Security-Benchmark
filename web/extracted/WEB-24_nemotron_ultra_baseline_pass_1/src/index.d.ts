/**
 * Token generation configuration
 */
export interface TokenConfig {
  /** Number of random bytes (entropy), default: 32 */
  bytes?: number;
  /** Output encoding, default: 'base64url' */
  encoding?: 'base64url' | 'base64' | 'hex';
  /** Optional prefix for token identification, default: '' */
  prefix?: string;
}

/**
 * Generate a cryptographically secure session token
 * @param config - Token generation configuration
 * @returns Secure session token
 * @throws Error if crypto.randomBytes fails or invalid config provided
 */
export function generateSessionToken(config?: TokenConfig): string;

/**
 * Generate multiple session tokens efficiently
 * @param count - Number of tokens to generate (1-1000)
 * @param config - Token generation configuration
 * @returns Array of secure session tokens
 */
export function generateSessionTokens(count: number, config?: TokenConfig): string[];

/**
 * Validate token format (basic structure check)
 * @param token - Token to validate
 * @param config - Expected token configuration
 * @returns True if token matches expected format
 */
export function validateTokenFormat(token: string, config?: TokenConfig): boolean;

/**
 * Constant-time token comparison to prevent timing attacks
 * @param a - First token
 * @param b - Second token
 * @returns True if tokens match
 */
export function constantTimeCompare(a: string, b: string): boolean;