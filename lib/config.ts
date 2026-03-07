/**
 * Centralized configuration for the application
 * This ensures all API calls use the same base URL
 */

// Get the base URL for server-side and client-side fetching
export function getBaseUrl(): string {
  // In browser, we can use relative URLs
  if (typeof window !== 'undefined') {
    return '';
  }

  // On server, we need absolute URL
  // Use environment variable or fallback to configured port
  return process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3500';
}

// Export as constant for convenience
export const BASE_URL = getBaseUrl();
