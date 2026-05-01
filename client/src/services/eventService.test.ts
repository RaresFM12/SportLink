import { describe, expect, it } from "vitest";
import { eventService } from "./eventService";
import type { EventItem } from "../types/event";
import {
  EVENTS_COUNT_AFTER_ADD,
  EVENTS_COUNT_AFTER_REMOVE,
  FIRST_EVENT_ID,
  FULL_EVENT_ID,
  FULL_EVENT_MAX_PARTICIPANTS,
  INITIAL_EVENTS_COUNT,
  NON_EXISTENT_EVENT_ID,
  ONE_PARTICIPANT,
  SECOND_EVENT_ID,
  THIRD_EVENT_ID,
  THREE_PARTICIPANTS,
  TWO_PARTICIPANTS,
  ZERO_PARTICIPANTS,
} from "../constants/testConstants";
import { MIN_PARTICIPANTS } from "../constants/validationConstants";

const mockEvents: EventItem[] = [
  {
    id: FIRST_EVENT_ID,
    title: "Football Match",
    sport: "Football",
    city: "Cluj-Napoca",
    location: "Central Park",
    date: "2026-03-25",
    startTime: "18:00",
    duration: "2 hours",
    maxParticipants: 10,
    currentParticipants: TWO_PARTICIPANTS,
    description: "Friendly football match.",
    participants: ["Bianca", "Alex"],
  },
  {
    id: SECOND_EVENT_ID,
    title: "Tennis Session",
    sport: "Tennis",
    city: "Bucharest",
    location: "Sport Arena",
    date: "2026-03-27",
    startTime: "10:00",
    duration: "1.5 hours",
    maxParticipants: 4,
    currentParticipants: ONE_PARTICIPANT,
    description: "Tennis training session.",
    participants: ["Maria"],
  },
];

describe("eventService.getAll", () => {
  it("returns all events", () => {
    const result = eventService.getAll(mockEvents);

    expect(result).toEqual(mockEvents);
    expect(result).toHaveLength(INITIAL_EVENTS_COUNT);
  });
});

describe("eventService.getById", () => {
  it("returns the event with the given id", () => {
    const result = eventService.getById(mockEvents, FIRST_EVENT_ID);

    expect(result).toEqual(mockEvents[0]);
  });

  it("returns null when the event does not exist", () => {
    const result = eventService.getById(mockEvents, NON_EXISTENT_EVENT_ID);

    expect(result).toBeNull();
  });
});

describe("eventService.add", () => {
  it("adds a new event", () => {
    const result = eventService.add(mockEvents, {
      title: "Basketball Game",
      sport: "Basketball",
      city: "Timisoara",
      location: "City Gym",
      date: "2026-04-01",
      startTime: "20:00",
      duration: "2 hours",
      maxParticipants: 12,
      description: "Competitive basketball game.",
      participants: [],
    });

    expect(result).toHaveLength(EVENTS_COUNT_AFTER_ADD);
    expect(result[THIRD_EVENT_ID - 1]).toMatchObject({
      id: THIRD_EVENT_ID,
      title: "Basketball Game",
      currentParticipants: ZERO_PARTICIPANTS,
      participants: [],
    });
  });

  it("sets currentParticipants based on participants length", () => {
    const result = eventService.add(mockEvents, {
      title: "Volleyball Match",
      sport: "Volleyball",
      city: "Iasi",
      location: "Beach Court",
      date: "2026-04-02",
      startTime: "16:00",
      duration: "2 hours",
      maxParticipants: 8,
      description: "Casual volleyball match.",
      participants: ["Ana", "Radu"],
    });

    expect(result[THIRD_EVENT_ID - 1].currentParticipants).toBe(TWO_PARTICIPANTS);
  });

  it("throws error when maxParticipants is less than minimum allowed", () => {
    expect(() =>
      eventService.add(mockEvents, {
        title: "Bad Event",
        sport: "Football",
        city: "Cluj",
        location: "Park",
        date: "2026-04-02",
        startTime: "16:00",
        duration: "2 hours",
        maxParticipants: MIN_PARTICIPANTS - 1,
        description: "This should fail.",
        participants: [],
      })
    ).toThrow(`Maximum participants must be at least ${MIN_PARTICIPANTS}.`);
  });

  it("throws error when participants exceed maximum participants", () => {
    expect(() =>
      eventService.add(mockEvents, {
        title: "Bad Event",
        sport: "Football",
        city: "Cluj",
        location: "Park",
        date: "2026-04-02",
        startTime: "16:00",
        duration: "2 hours",
        maxParticipants: MIN_PARTICIPANTS,
        description: "This should fail.",
        participants: ["A", "B", "C"],
      })
    ).toThrow("Participants cannot exceed maximum participants.");
  });
});

describe("eventService.update", () => {
  it("updates an existing event", () => {
    const result = eventService.update(mockEvents, FIRST_EVENT_ID, {
      title: "Updated Football Match",
      city: "Brasov",
    });

    expect(result[0].title).toBe("Updated Football Match");
    expect(result[0].city).toBe("Brasov");
    expect(result[0].id).toBe(FIRST_EVENT_ID);
  });

  it("keeps unchanged events intact", () => {
    const result = eventService.update(mockEvents, FIRST_EVENT_ID, {
      title: "Updated Football Match",
    });

    expect(result[1]).toEqual(mockEvents[1]);
  });

  it("throws error when event does not exist", () => {
    expect(() =>
      eventService.update(mockEvents, NON_EXISTENT_EVENT_ID, {
        title: "Missing Event",
      })
    ).toThrow("Event not found.");
  });

  it("throws error when maxParticipants is less than minimum allowed", () => {
    expect(() =>
      eventService.update(mockEvents, FIRST_EVENT_ID, {
        maxParticipants: MIN_PARTICIPANTS - 1,
      })
    ).toThrow(`Maximum participants must be at least ${MIN_PARTICIPANTS}.`);
  });

  it("throws error when maxParticipants is lower than currentParticipants", () => {
    expect(() =>
      eventService.update(mockEvents, FIRST_EVENT_ID, {
        maxParticipants: TWO_PARTICIPANTS,
        currentParticipants: THREE_PARTICIPANTS,
      })
    ).toThrow("Maximum participants cannot be lower than current participants.");
  });

  it("throws error when participants length does not match currentParticipants", () => {
    expect(() =>
      eventService.update(mockEvents, FIRST_EVENT_ID, {
        participants: ["Bianca", "Alex", "Maria"],
        currentParticipants: TWO_PARTICIPANTS,
      })
    ).toThrow("Participants count is inconsistent.");
  });
});

describe("eventService.remove", () => {
  it("removes the event with the given id", () => {
    const result = eventService.remove(mockEvents, FIRST_EVENT_ID);

    expect(result).toHaveLength(EVENTS_COUNT_AFTER_REMOVE);
    expect(result[0].id).toBe(SECOND_EVENT_ID);
  });

  it("returns same array content when id does not exist", () => {
    const result = eventService.remove(mockEvents, NON_EXISTENT_EVENT_ID);

    expect(result).toEqual(mockEvents);
  });
});

describe("eventService.toggleParticipation", () => {
  it("adds the user when not already joined and event is not full", () => {
    const result = eventService.toggleParticipation(mockEvents, FIRST_EVENT_ID, "Maria");
    const updatedEvent = result.find((event) => event.id === FIRST_EVENT_ID)!;

    expect(updatedEvent.participants).toContain("Maria");
    expect(updatedEvent.currentParticipants).toBe(THREE_PARTICIPANTS);
  });

  it("removes the user when already joined", () => {
    const result = eventService.toggleParticipation(mockEvents, FIRST_EVENT_ID, "Bianca");
    const updatedEvent = result.find((event) => event.id === FIRST_EVENT_ID)!;

    expect(updatedEvent.participants).not.toContain("Bianca");
    expect(updatedEvent.currentParticipants).toBe(ONE_PARTICIPANT);
  });

  it("does not add user when event is full", () => {
    const fullEvents: EventItem[] = [
      {
        id: FULL_EVENT_ID,
        title: "Full Event",
        sport: "Football",
        city: "Cluj",
        location: "Park",
        date: "2026-04-10",
        startTime: "18:00",
        duration: "2 hours",
        maxParticipants: FULL_EVENT_MAX_PARTICIPANTS,
        currentParticipants: FULL_EVENT_MAX_PARTICIPANTS,
        description: "Already full.",
        participants: ["A", "B"],
      },
    ];

    const result = eventService.toggleParticipation(fullEvents, FULL_EVENT_ID, "C");

    expect(result[0].participants).toEqual(["A", "B"]);
    expect(result[0].currentParticipants).toBe(FULL_EVENT_MAX_PARTICIPANTS);
  });

  it("does not change unrelated events", () => {
    const result = eventService.toggleParticipation(mockEvents, FIRST_EVENT_ID, "Maria");

    expect(result[1]).toEqual(mockEvents[1]);
  });
});