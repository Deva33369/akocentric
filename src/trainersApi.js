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
    throw new Error(error.message || 'Trainer request failed.');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json().catch(() => null);
}

export function fetchTrainers() {
  return request('/api/trainers');
}

export function createTrainer(trainer) {
  return request('/api/trainers', {
    method: 'POST',
    body: JSON.stringify(trainer),
  });
}

export function updateTrainer(trainerId, trainer) {
  return request(`/api/trainers/${trainerId}`, {
    method: 'PUT',
    body: JSON.stringify(trainer),
  });
}

export function deleteTrainer(trainerId) {
  return request(`/api/trainers/${trainerId}`, {
    method: 'DELETE',
  });
}

export async function seedTrainers(trainers) {
  const created = [];

  for (const trainer of trainers) {
    const nextTrainer = await createTrainer({
      name: trainer.name,
      username: trainer.username,
      email: trainer.email,
      password: trainer.password,
      notes: trainer.notes || '',
      availabilities: trainer.availabilities || [],
    });
    created.push(nextTrainer);
  }

  return created;
}
