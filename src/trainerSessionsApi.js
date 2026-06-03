import { apiBase, assertJsonResponse } from './apiConfig';

export async function fetchTrainerSessions(month) {
  const url = month
    ? `${apiBase}/trainer-sessions?month=${encodeURIComponent(month)}`
    : `${apiBase}/trainer-sessions`;
  const response = await fetch(url);
  assertJsonResponse(response);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Failed to load trainer sessions: ${response.status}`);
  }
  return data;
}

export async function deleteTrainerSession(sessionId) {
  const response = await fetch(`${apiBase}/trainer-sessions/${sessionId}`, { method: 'DELETE' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to delete trainer session.');
  }
}

export async function createTrainerSessionsBulk(sessions) {
  const response = await fetch(`${apiBase}/trainer-sessions/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessions }),
  });
  assertJsonResponse(response);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to save trainer sessions.');
  }
  return data;
}

export async function updateTrainerSession(sessionId, updates) {
  const response = await fetch(`${apiBase}/trainer-sessions/${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  assertJsonResponse(response);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update trainer session.');
  }
  return data;
}

export async function updateTrainerSessionAttendance(sessionId, studentId, status) {
  const response = await fetch(`${apiBase}/trainer-sessions/${sessionId}/attendance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, status }),
  });
  assertJsonResponse(response);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update attendance.');
  }
  return data;
}
