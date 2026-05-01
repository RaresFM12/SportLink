import type { CreateEventInput, UpdateEventInput } from '../types/event.js';
import { HttpError } from '../utils/httpErrors.js';

const SPORT_OPTIONS = new Set([
  'Football',
  'Basketball',
  'Tennis',
  'Volleyball',
  'Baseball',
  'Other'
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function ensureParticipantsAreValid(participants: unknown): asserts participants is string[] {
  if (!Array.isArray(participants) || participants.some((participant) => !isNonEmptyString(participant))) {
    throw new HttpError(400, 'Participants must be an array of non-empty strings.');
  }
}

export function validateCreateEventInput(payload: unknown): asserts payload is CreateEventInput {
  if (typeof payload !== 'object' || payload === null) {
    throw new HttpError(400, 'Request body must be a valid object.');
  }

  const data = payload as Record<string, unknown>;
  const requiredFields = [
    'title',
    'sport',
    'city',
    'date',
    'startTime',
    'duration',
    'location',
    'maxParticipants',
    'description',
    'participants'
  ];

  for (const field of requiredFields) {
    if (!(field in data)) {
      throw new HttpError(400, `Missing required field: ${field}.`);
    }
  }

  if (!isNonEmptyString(data.title)) throw new HttpError(400, 'Title is required.');
  if (!isNonEmptyString(data.sport)) throw new HttpError(400, 'Sport is required.');
  if (!SPORT_OPTIONS.has(data.sport.trim())) throw new HttpError(400, 'Sport is invalid.');
  if (!isNonEmptyString(data.city)) throw new HttpError(400, 'City is required.');
  if (!isNonEmptyString(data.date) || !isValidIsoDate(data.date)) throw new HttpError(400, 'Date must be a valid YYYY-MM-DD value.');
  if (!isNonEmptyString(data.startTime) || !isValidTime(data.startTime)) throw new HttpError(400, 'Start time must be a valid HH:mm value.');
  if (!isNonEmptyString(data.duration)) throw new HttpError(400, 'Duration is required.');
  if (!isNonEmptyString(data.location)) throw new HttpError(400, 'Location is required.');
  if (typeof data.maxParticipants !== 'number' || !Number.isInteger(data.maxParticipants) || data.maxParticipants < 2) {
    throw new HttpError(400, 'Maximum participants must be an integer greater than or equal to 2.');
  }
  if (!isNonEmptyString(data.description)) throw new HttpError(400, 'Description is required.');

  ensureParticipantsAreValid(data.participants);
  if (data.participants.length > data.maxParticipants) {
    throw new HttpError(400, 'Participants cannot exceed maximum participants.');
  }
}

export function validateUpdateEventInput(payload: unknown): asserts payload is UpdateEventInput {
  if (typeof payload !== 'object' || payload === null) {
    throw new HttpError(400, 'Request body must be a valid object.');
  }

  const data = payload as Record<string, unknown>;

  if ('title' in data && !isNonEmptyString(data.title)) throw new HttpError(400, 'Title cannot be empty.');
  if ('sport' in data) {
    if (!isNonEmptyString(data.sport)) throw new HttpError(400, 'Sport cannot be empty.');
    if (!SPORT_OPTIONS.has(data.sport.trim())) throw new HttpError(400, 'Sport is invalid.');
  }
  if ('city' in data && !isNonEmptyString(data.city)) throw new HttpError(400, 'City cannot be empty.');
  if ('date' in data && (!isNonEmptyString(data.date) || !isValidIsoDate(data.date))) {
    throw new HttpError(400, 'Date must be a valid YYYY-MM-DD value.');
  }
  if ('startTime' in data && (!isNonEmptyString(data.startTime) || !isValidTime(data.startTime))) {
    throw new HttpError(400, 'Start time must be a valid HH:mm value.');
  }
  if ('duration' in data && !isNonEmptyString(data.duration)) throw new HttpError(400, 'Duration cannot be empty.');
  if ('location' in data && !isNonEmptyString(data.location)) throw new HttpError(400, 'Location cannot be empty.');
  if ('maxParticipants' in data) {
    if (typeof data.maxParticipants !== 'number' || !Number.isInteger(data.maxParticipants) || data.maxParticipants < 2) {
      throw new HttpError(400, 'Maximum participants must be an integer greater than or equal to 2.');
    }
  }
  if ('description' in data && !isNonEmptyString(data.description)) throw new HttpError(400, 'Description cannot be empty.');
  if ('participants' in data) {
    ensureParticipantsAreValid(data.participants);
  }
  if ('currentParticipants' in data) {
    throw new HttpError(400, 'currentParticipants is managed by the server and cannot be updated directly.');
  }
}

export function validateUserName(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) {
    throw new HttpError(400, 'Request body must be a valid object.');
  }

  const { userName } = payload as { userName?: unknown };

  if (!isNonEmptyString(userName)) {
    throw new HttpError(400, 'userName is required.');
  }

  return userName.trim();
}
