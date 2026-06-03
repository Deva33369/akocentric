import { apiBase, assertJsonResponse } from './apiConfig';

export async function fetchEnrollments() {
  const response = await fetch(`${apiBase}/enrollments`);
  assertJsonResponse(response);
  if (!response.ok) {
    throw new Error(`Failed to load enrollments: ${response.status}`);
  }
  return response.json();
}

export async function createEnrollment(enrollment) {
  const response = await fetch(`${apiBase}/enrollments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enrollment),
  });
  assertJsonResponse(response);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to create enrollment.');
  }
  return data;
}

export async function updateEnrollment(enrollmentId, enrollment) {
  const response = await fetch(`${apiBase}/enrollments/${enrollmentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enrollment),
  });
  assertJsonResponse(response);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update enrollment.');
  }
  return data;
}

export async function deleteEnrollment(enrollmentId) {
  const response = await fetch(`${apiBase}/enrollments/${enrollmentId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to delete enrollment.');
  }
}

export async function extendEnrollmentSchedule(enrollmentId, entries) {
  const response = await fetch(`${apiBase}/enrollments/${enrollmentId}/schedule`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to extend enrollment schedule.');
  }
}
