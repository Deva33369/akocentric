import { apiBaseUrl } from './apiConfig';

async function postEmail(path, payload) {
  if (process.env.NODE_ENV === 'test') {
    return { ok: true };
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Email request failed.');
  }

  return response.json().catch(() => ({}));
}

export function sendApprovalRequestEmail(payload) {
  return postEmail('/api/email/account-request', payload);
}

export function sendApprovalGrantedEmail(payload) {
  return postEmail('/api/email/account-approved', payload);
}

export function sendForgotPasswordEmail(email) {
  return postEmail('/api/email/forgot-password', { email });
}
