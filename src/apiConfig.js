const DEFAULT_API_BASE_URL = '';

export const API_UNAVAILABLE_MESSAGE = 'The deployed API is not reachable. Check REACT_APP_API_BASE_URL and your Google Cloud service.';

export const apiBaseUrl = (process.env.REACT_APP_API_BASE_URL || DEFAULT_API_BASE_URL)
  .trim()
  .replace(/\/+$/, '');

export const apiBase = apiBaseUrl ? `${apiBaseUrl}/api` : '/api';

export function assertJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new Error(API_UNAVAILABLE_MESSAGE);
  }
}
