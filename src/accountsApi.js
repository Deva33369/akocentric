import { apiBaseUrl } from './apiConfig';

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Request failed.');
  }
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

export function fetchApprovedAccounts() {
  return request('/api/approved-accounts');
}

export function createApprovedAccount(account) {
  return request('/api/approved-accounts', {
    method: 'POST',
    body: JSON.stringify(account),
  });
}

export function deleteApprovedAccount(accountId) {
  return request(`/api/approved-accounts/${accountId}`, { method: 'DELETE' });
}

export function fetchPendingRequests() {
  return request('/api/pending-requests');
}

export function createPendingRequest(account) {
  return request('/api/pending-requests', {
    method: 'POST',
    body: JSON.stringify(account),
  });
}

export function deletePendingRequest(requestId) {
  return request(`/api/pending-requests/${requestId}`, { method: 'DELETE' });
}
