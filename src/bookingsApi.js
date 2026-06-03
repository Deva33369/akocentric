import { apiBase, assertJsonResponse } from './apiConfig';

export async function fetchBookings(month) {
  const url = month ? `${apiBase}/bookings?month=${encodeURIComponent(month)}` : `${apiBase}/bookings`;
  const response = await fetch(url);
  assertJsonResponse(response);
  if (!response.ok) {
    throw new Error(`Failed to load bookings: ${response.status}`);
  }
  return response.json();
}

export async function createBooking(booking) {
  const response = await fetch(`${apiBase}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  });
  assertJsonResponse(response);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to create booking.');
  }
  return data;
}

export async function updateBooking(bookingId, updates) {
  const response = await fetch(`${apiBase}/bookings/${bookingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  assertJsonResponse(response);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update booking.');
  }
  return data;
}

export async function deleteBooking(bookingId) {
  const response = await fetch(`${apiBase}/bookings/${bookingId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to delete booking.');
  }
}
