import {
  MIN_CITY_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  MIN_LOCATION_LENGTH,
  MIN_PARTICIPANTS,
  MIN_POSITIVE_DURATION,
  MIN_TITLE_LENGTH,
} from "../constants/validationConstants";

export type EventFormValues = {
  title: string;
  sport: string;
  city: string;
  date: string;
  startTime: string;
  duration: string;
  location: string;
  maxParticipants: string;
  description: string;
  currentParticipants?: number;
};

export type EventFormErrors = Partial<Record<keyof EventFormValues, string>>;

export function validateEventForm(values: EventFormValues): EventFormErrors {
  const errors: EventFormErrors = {};

  const title = values.title.trim();
  const sport = values.sport.trim();
  const city = values.city.trim();
  const date = values.date.trim();
  const startTime = values.startTime.trim();
  const duration = values.duration.trim();
  const location = values.location.trim();
  const maxParticipants = values.maxParticipants.trim();
  const description = values.description.trim();

  if (!title) {
    errors.title = "Title is required.";
  } else if (title.length < MIN_TITLE_LENGTH) {
    errors.title = `Title must have at least ${MIN_TITLE_LENGTH} characters.`;
  }

  if (!sport) {
    errors.sport = "Sport is required.";
  }

  if (!city) {
    errors.city = "City is required.";
  } else if (city.length < MIN_CITY_LENGTH) {
    errors.city = `City must have at least ${MIN_CITY_LENGTH} characters.`;
  }

  if (!date) {
    errors.date = "Date is required.";
  } else if (Number.isNaN(new Date(date).getTime())) {
    errors.date = "Date is invalid.";
  }

  if (!startTime) {
    errors.startTime = "Start time is required.";
  }

  if (!duration) {
    errors.duration = "Duration is required.";
  } else if (!isValidDuration(duration)) {
    errors.duration = "Duration must be a positive value.";
  }

  if (!location) {
    errors.location = "Location is required.";
  } else if (location.length < MIN_LOCATION_LENGTH) {
    errors.location = `Location must have at least ${MIN_LOCATION_LENGTH} characters.`;
  }

  if (!maxParticipants) {
    errors.maxParticipants = "Maximum participants is required.";
  } else {
    const parsed = Number(maxParticipants);

    if (!Number.isInteger(parsed)) {
      errors.maxParticipants = "Maximum participants must be an integer.";
    } else if (parsed < MIN_PARTICIPANTS) {
      errors.maxParticipants = `Maximum participants must be at least ${MIN_PARTICIPANTS}.`;
    } else if (
      values.currentParticipants !== undefined &&
      parsed < values.currentParticipants
    ) {
      errors.maxParticipants =
        "Maximum participants cannot be lower than current participants.";
    }
  }

  if (!description) {
    errors.description = "Description is required.";
  } else if (description.length < MIN_DESCRIPTION_LENGTH) {
    errors.description = `Description must have at least ${MIN_DESCRIPTION_LENGTH} characters.`;
  }

  return errors;
}

export function hasValidationErrors(errors: Record<string, string | undefined>) {
  return Object.values(errors).some(Boolean);
}

function isValidDuration(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  const numericValue = Number(trimmed);

  if (!Number.isNaN(numericValue)) {
    return numericValue > MIN_POSITIVE_DURATION;
  }

  return /^(\d+(\.\d+)?)\s*(min|mins|minute|minutes|h|hour|hours)$/i.test(trimmed);
}