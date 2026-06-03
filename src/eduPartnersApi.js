import { apiBaseUrl } from './apiConfig';

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Edu partner request failed.');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json().catch(() => null);
}

export function fetchEduPartners() {
  return request('/api/edu-partners');
}

export function createEduPartner(partner) {
  return request('/api/edu-partners', {
    method: 'POST',
    body: JSON.stringify(partner),
  });
}

export function deleteEduPartner(partnerId) {
  return request(`/api/edu-partners/${partnerId}`, {
    method: 'DELETE',
  });
}

export function deleteEduPartnerByEmail(email) {
  return request(`/api/edu-partners/by-email/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  });
}
