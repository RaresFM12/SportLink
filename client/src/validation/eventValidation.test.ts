import { describe, expect, it } from "vitest";
import {
  hasValidationErrors,
  validateEventForm,
} from "./eventValidation";
import {
  MIN_DESCRIPTION_LENGTH,
  MIN_PARTICIPANTS,
  MIN_TITLE_LENGTH,
} from "../constants/validationConstants";

describe("validateEventForm", () => {
  it("returns no errors for a valid form", () => {
    const result = validateEventForm({
      title: "Football Match",
      sport: "Football",
      city: "Cluj",
      date: "2026-04-10",
      startTime: "18:00",
      duration: "2 hours",
      location: "Central Park",
      maxParticipants: "10",
      description: "Friendly football match for all players.",
    });

    expect(result).toEqual({});
  });

  it("validates required fields", () => {
    const result = validateEventForm({
      title: "",
      sport: "",
      city: "",
      date: "",
      startTime: "",
      duration: "",
      location: "",
      maxParticipants: "",
      description: "",
    });

    expect(result.title).toBe("Title is required.");
    expect(result.sport).toBe("Sport is required.");
    expect(result.city).toBe("City is required.");
    expect(result.date).toBe("Date is required.");
    expect(result.startTime).toBe("Start time is required.");
    expect(result.duration).toBe("Duration is required.");
    expect(result.location).toBe("Location is required.");
    expect(result.maxParticipants).toBe("Maximum participants is required.");
    expect(result.description).toBe("Description is required.");
  });

  it("validates minimum title length", () => {
    const invalidTitle = "H".repeat(MIN_TITLE_LENGTH - 1);

    const result = validateEventForm({
      title: invalidTitle,
      sport: "Football",
      city: "Cluj",
      date: "2026-04-10",
      startTime: "18:00",
      duration: "2 hours",
      location: "Central Park",
      maxParticipants: "10",
      description: "Friendly football match for all players.",
    });

    expect(result.title).toBe(
      `Title must have at least ${MIN_TITLE_LENGTH} characters.`
    );
  });

  it("validates minimum city length", () => {
    const result = validateEventForm({
      title: "Football Match",
      sport: "Football",
      city: "C",
      date: "2026-04-10",
      startTime: "18:00",
      duration: "2 hours",
      location: "Central Park",
      maxParticipants: "10",
      description: "Friendly football match for all players.",
    });

    expect(result.city).toBe("City must have at least 2 characters.");
  });

  it("validates invalid date", () => {
    const result = validateEventForm({
      title: "Football Match",
      sport: "Football",
      city: "Cluj",
      date: "not-a-date",
      startTime: "18:00",
      duration: "2 hours",
      location: "Central Park",
      maxParticipants: "10",
      description: "Friendly football match for all players.",
    });

    expect(result.date).toBe("Date is invalid.");
  });

  it("validates invalid duration", () => {
    const result = validateEventForm({
      title: "Football Match",
      sport: "Football",
      city: "Cluj",
      date: "2026-04-10",
      startTime: "18:00",
      duration: "zero",
      location: "Central Park",
      maxParticipants: "10",
      description: "Friendly football match for all players.",
    });

    expect(result.duration).toBe("Duration must be a positive value.");
  });

  it("accepts numeric duration", () => {
    const result = validateEventForm({
      title: "Football Match",
      sport: "Football",
      city: "Cluj",
      date: "2026-04-10",
      startTime: "18:00",
      duration: "90",
      location: "Central Park",
      maxParticipants: "10",
      description: "Friendly football match for all players.",
    });

    expect(result.duration).toBeUndefined();
  });

  it("validates minimum location length", () => {
    const result = validateEventForm({
      title: "Football Match",
      sport: "Football",
      city: "Cluj",
      date: "2026-04-10",
      startTime: "18:00",
      duration: "2 hours",
      location: "AB",
      maxParticipants: "10",
      description: "Friendly football match for all players.",
    });

    expect(result.location).toBe("Location must have at least 3 characters.");
  });

  it("validates maxParticipants as integer", () => {
    const result = validateEventForm({
      title: "Football Match",
      sport: "Football",
      city: "Cluj",
      date: "2026-04-10",
      startTime: "18:00",
      duration: "2 hours",
      location: "Central Park",
      maxParticipants: "2.5",
      description: "Friendly football match for all players.",
    });

    expect(result.maxParticipants).toBe(
      "Maximum participants must be an integer."
    );
  });

  it("validates maxParticipants minimum value", () => {
    const result = validateEventForm({
      title: "Football Match",
      sport: "Football",
      city: "Cluj",
      date: "2026-04-10",
      startTime: "18:00",
      duration: "2 hours",
      location: "Central Park",
      maxParticipants: String(MIN_PARTICIPANTS - 1),
      description: "Friendly football match for all players.",
    });

    expect(result.maxParticipants).toBe(
      `Maximum participants must be at least ${MIN_PARTICIPANTS}.`
    );
  });

  it("validates maxParticipants against currentParticipants", () => {
    const result = validateEventForm({
      title: "Football Match",
      sport: "Football",
      city: "Cluj",
      date: "2026-04-10",
      startTime: "18:00",
      duration: "2 hours",
      location: "Central Park",
      maxParticipants: String(MIN_PARTICIPANTS),
      description: "Friendly football match for all players.",
      currentParticipants: MIN_PARTICIPANTS + 1,
    });

    expect(result.maxParticipants).toBe(
      "Maximum participants cannot be lower than current participants."
    );
  });

  it("validates minimum description length", () => {
    const shortDescription = "a".repeat(MIN_DESCRIPTION_LENGTH - 1);

    const result = validateEventForm({
      title: "Football Match",
      sport: "Football",
      city: "Cluj",
      date: "2026-04-10",
      startTime: "18:00",
      duration: "2 hours",
      location: "Central Park",
      maxParticipants: "10",
      description: shortDescription,
    });

    expect(result.description).toBe(
      `Description must have at least ${MIN_DESCRIPTION_LENGTH} characters.`
    );
  });
});

describe("hasValidationErrors", () => {
  it("returns true when there is at least one error", () => {
    const result = hasValidationErrors({
      title: "Title is required.",
      city: undefined,
    });

    expect(result).toBe(true);
  });

  it("returns false when there are no errors", () => {
    const result = hasValidationErrors({
      title: undefined,
      city: undefined,
      date: undefined,
    });

    expect(result).toBe(false);
  });
});