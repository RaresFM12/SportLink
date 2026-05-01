import { describe, expect, it } from 'vitest';
import {
  validateCreateEventInput,
  validateUpdateEventInput,
  validateUserName
} from '../src/validators/eventValidator.js';

function validCreatePayload() {
  return {
    title: 'Football Match',
    sport: 'Football',
    city: 'Cluj-Napoca',
    date: '2026-05-01',
    startTime: '10:30',
    duration: '2 hours',
    location: 'City Arena',
    maxParticipants: 10,
    description: 'Friendly match',
    participants: ['Bianca', 'Rares']
  };
}

describe('eventValidator - validateCreateEventInput', () => {
  it('accepts a valid create payload', () => {
    const payload = validCreatePayload();

    expect(() => validateCreateEventInput(payload)).not.toThrow();
  });

  it('rejects non-object payload', () => {
    expect(() => validateCreateEventInput(null)).toThrowError('Request body must be a valid object.');
  });

  it.each([
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
  ])('rejects missing required field: %s', (field) => {
    const payload = validCreatePayload();
    delete (payload as Record<string, unknown>)[field];

    expect(() => validateCreateEventInput(payload)).toThrowError(
      `Missing required field: ${field}.`
    );
  });

  it('rejects empty title', () => {
    const payload = { ...validCreatePayload(), title: '   ' };
    expect(() => validateCreateEventInput(payload)).toThrowError('Title is required.');
  });

  it('rejects empty sport', () => {
    const payload = { ...validCreatePayload(), sport: '   ' };
    expect(() => validateCreateEventInput(payload)).toThrowError('Sport is required.');
  });

  it('rejects invalid sport', () => {
    const payload = { ...validCreatePayload(), sport: 'Chess' };
    expect(() => validateCreateEventInput(payload)).toThrowError('Sport is invalid.');
  });

  it('accepts sport with surrounding spaces if trimmed value is valid', () => {
    const payload = { ...validCreatePayload(), sport: '  Football  ' };
    expect(() => validateCreateEventInput(payload)).not.toThrow();
  });

  it('rejects empty city', () => {
    const payload = { ...validCreatePayload(), city: '' };
    expect(() => validateCreateEventInput(payload)).toThrowError('City is required.');
  });

  it('rejects invalid date format', () => {
    const payload = { ...validCreatePayload(), date: '05/01/2026' };
    expect(() => validateCreateEventInput(payload)).toThrowError(
      'Date must be a valid YYYY-MM-DD value.'
    );
  });

  it('rejects invalid date format', () => {
    const payload = { ...validCreatePayload(), date: '05/01/2026' };
    expect(() => validateCreateEventInput(payload)).toThrowError(
      'Date must be a valid YYYY-MM-DD value.'
    );
  });

  it('rejects invalid start time', () => {
    const payload = { ...validCreatePayload(), startTime: '25:61' };
    expect(() => validateCreateEventInput(payload)).toThrowError(
      'Start time must be a valid HH:mm value.'
    );
  });

  it('rejects empty duration', () => {
    const payload = { ...validCreatePayload(), duration: ' ' };
    expect(() => validateCreateEventInput(payload)).toThrowError('Duration is required.');
  });

  it('rejects empty location', () => {
    const payload = { ...validCreatePayload(), location: '' };
    expect(() => validateCreateEventInput(payload)).toThrowError('Location is required.');
  });

  it('rejects non-number maxParticipants', () => {
    const payload = { ...validCreatePayload(), maxParticipants: '10' };
    expect(() => validateCreateEventInput(payload)).toThrowError(
      'Maximum participants must be an integer greater than or equal to 2.'
    );
  });

  it('rejects non-integer maxParticipants', () => {
    const payload = { ...validCreatePayload(), maxParticipants: 2.5 };
    expect(() => validateCreateEventInput(payload)).toThrowError(
      'Maximum participants must be an integer greater than or equal to 2.'
    );
  });

  it('rejects maxParticipants lower than 2', () => {
    const payload = { ...validCreatePayload(), maxParticipants: 1 };
    expect(() => validateCreateEventInput(payload)).toThrowError(
      'Maximum participants must be an integer greater than or equal to 2.'
    );
  });

  it('rejects empty description', () => {
    const payload = { ...validCreatePayload(), description: ' ' };
    expect(() => validateCreateEventInput(payload)).toThrowError('Description is required.');
  });

  it('rejects participants when not an array', () => {
    const payload = { ...validCreatePayload(), participants: 'Bianca' };
    expect(() => validateCreateEventInput(payload)).toThrowError(
      'Participants must be an array of non-empty strings.'
    );
  });

  it('rejects participants with empty strings', () => {
    const payload = { ...validCreatePayload(), participants: ['Bianca', '   '] };
    expect(() => validateCreateEventInput(payload)).toThrowError(
      'Participants must be an array of non-empty strings.'
    );
  });

  it('rejects participants count exceeding maxParticipants', () => {
    const payload = { ...validCreatePayload(), maxParticipants: 2, participants: ['A', 'B', 'C'] };
    expect(() => validateCreateEventInput(payload)).toThrowError(
      'Participants cannot exceed maximum participants.'
    );
  });
});

describe('eventValidator - validateUpdateEventInput', () => {
  it('accepts a valid partial payload', () => {
    expect(() =>
      validateUpdateEventInput({
        title: 'Updated title',
        sport: 'Basketball',
        city: 'Oradea',
        date: '2026-06-01',
        startTime: '08:00',
        duration: '1 hour',
        location: 'Court',
        maxParticipants: 12,
        description: 'Updated description',
        participants: ['Ana']
      })
    ).not.toThrow();
  });

  it('rejects non-object payload', () => {
    expect(() => validateUpdateEventInput(null)).toThrowError(
      'Request body must be a valid object.'
    );
  });

  it('rejects empty title', () => {
    expect(() => validateUpdateEventInput({ title: '' })).toThrowError('Title cannot be empty.');
  });

  it('rejects empty sport', () => {
    expect(() => validateUpdateEventInput({ sport: ' ' })).toThrowError('Sport cannot be empty.');
  });

  it('rejects invalid sport', () => {
    expect(() => validateUpdateEventInput({ sport: 'Chess' })).toThrowError('Sport is invalid.');
  });

  it('accepts trimmed valid sport', () => {
    expect(() => validateUpdateEventInput({ sport: '  Tennis  ' })).not.toThrow();
  });

  it('rejects empty city', () => {
    expect(() => validateUpdateEventInput({ city: '' })).toThrowError('City cannot be empty.');
  });

  it('rejects invalid date', () => {
    expect(() => validateUpdateEventInput({ date: 'bad-date' })).toThrowError(
      'Date must be a valid YYYY-MM-DD value.'
    );
  });

  it('rejects invalid time', () => {
    expect(() => validateUpdateEventInput({ startTime: '99:99' })).toThrowError(
      'Start time must be a valid HH:mm value.'
    );
  });

  it('rejects empty duration', () => {
    expect(() => validateUpdateEventInput({ duration: '' })).toThrowError(
      'Duration cannot be empty.'
    );
  });

  it('rejects empty location', () => {
    expect(() => validateUpdateEventInput({ location: ' ' })).toThrowError(
      'Location cannot be empty.'
    );
  });

  it('rejects invalid maxParticipants type/value', () => {
    expect(() => validateUpdateEventInput({ maxParticipants: 1 })).toThrowError(
      'Maximum participants must be an integer greater than or equal to 2.'
    );
  });

  it('rejects empty description', () => {
    expect(() => validateUpdateEventInput({ description: '' })).toThrowError(
      'Description cannot be empty.'
    );
  });

  it('rejects invalid participants array', () => {
    expect(() => validateUpdateEventInput({ participants: ['Ana', ''] })).toThrowError(
      'Participants must be an array of non-empty strings.'
    );
  });

  it('rejects direct currentParticipants updates', () => {
    expect(() => validateUpdateEventInput({ currentParticipants: 5 })).toThrowError(
      'currentParticipants is managed by the server and cannot be updated directly.'
    );
  });
});

describe('eventValidator - validateUserName', () => {
  it('returns trimmed userName for valid payload', () => {
    expect(validateUserName({ userName: '  Bianca  ' })).toBe('Bianca');
  });

  it('rejects non-object payload', () => {
    expect(() => validateUserName(null)).toThrowError('Request body must be a valid object.');
  });

  it('rejects missing userName', () => {
    expect(() => validateUserName({})).toThrowError('userName is required.');
  });

  it('rejects empty userName', () => {
    expect(() => validateUserName({ userName: '   ' })).toThrowError('userName is required.');
  });
});