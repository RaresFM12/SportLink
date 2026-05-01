import type { EventItem } from "../types/event";
import type {
  CreateEventInput,
  EventListQuery,
  PaginatedEventsResponse,
  StatisticsData,
  UpdateEventInput,
} from "./eventService";

type PendingOperation =
  | { type: "add"; tempId: number; payload: CreateEventInput }
  | { type: "update"; id: number; payload: UpdateEventInput }
  | { type: "remove"; id: number }
  | { type: "join"; id: number; userName: string }
  | { type: "leave"; id: number; userName: string };

const EVENTS_STORAGE_KEY = "sportlink.offline.events";
const PENDING_STORAGE_KEY = "sportlink.offline.pending";
const TEMP_ID_STORAGE_KEY = "sportlink.offline.temp-id";

function canUseBrowserStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function cloneEvent(event: EventItem): EventItem {
  return { ...event, participants: [...event.participants] };
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseBrowserStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!canUseBrowserStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getNextTempId(): number {
  if (!canUseBrowserStorage()) return -1;
  const storedValue = Number(window.localStorage.getItem(TEMP_ID_STORAGE_KEY) ?? "-1");
  const currentValue = Number.isInteger(storedValue) && storedValue < 0 ? storedValue : -1;
  window.localStorage.setItem(TEMP_ID_STORAGE_KEY, String(currentValue - 1));
  return currentValue;
}

function filterEventsByQuery(events: EventItem[], query: EventListQuery): EventItem[] {
  return events.filter((event) => {
    if (query.sport && query.sport !== "all") {
      if (event.sport.toLowerCase() !== query.sport.toLowerCase()) return false;
    }
    if (query.date && event.date !== query.date) return false;
    if (query.location) {
      const locationNeedle = query.location.toLowerCase();
      const searchableText = `${event.location} ${event.city}`.toLowerCase();
      if (!searchableText.includes(locationNeedle)) return false;
    }
    if (query.joinedOnly) {
      if (!query.user) return false;
      if (!event.participants.includes(query.user)) return false;
    }
    return true;
  });
}

function paginateEvents(events: EventItem[], query: EventListQuery): PaginatedEventsResponse {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 ? query.limit : 10;
  const totalItems = events.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
  const startIndex = (page - 1) * limit;
  const paginatedItems = events.slice(startIndex, startIndex + limit);
  return { items: paginatedItems, page, limit, totalItems, totalPages };
}

function buildStatistics(events: EventItem[]): StatisticsData {
  const sportsMap = new Map<string, number>();
  const locationsMap = new Map<string, number>();
  const datesMap = new Map<string, number>();

  for (const event of events) {
    sportsMap.set(event.sport, (sportsMap.get(event.sport) ?? 0) + 1);
    locationsMap.set(event.location, (locationsMap.get(event.location) ?? 0) + 1);
    datesMap.set(event.date, (datesMap.get(event.date) ?? 0) + 1);
  }

  return {
    sports: Array.from(sportsMap.entries()).map(([sport, count]) => ({ sport, count })),
    locations: Array.from(locationsMap.entries()).map(([location, count]) => ({ location, count })),
    dates: Array.from(datesMap.entries()).map(([date, count]) => ({ date, count })),
    // Comments are not available offline — return empty stats
    comments: {
      totalComments: 0,
      commentsPerEvent: [],
      mostCommentedEvents: [],
    },
  };
}

export const offlineEvents = {
  getEvents(): EventItem[] {
    return readJson<EventItem[]>(EVENTS_STORAGE_KEY, []).map(cloneEvent);
  },

  setEvents(events: EventItem[]): void {
    writeJson(EVENTS_STORAGE_KEY, events.map(cloneEvent));
  },

  replaceAll(events: EventItem[]): void {
    this.setEvents(events);
  },

  getPendingOperations(): PendingOperation[] {
    return readJson<PendingOperation[]>(PENDING_STORAGE_KEY, []);
  },

  setPendingOperations(operations: PendingOperation[]): void {
    writeJson(PENDING_STORAGE_KEY, operations);
  },

  clearPendingOperations(): void {
    if (!canUseBrowserStorage()) return;
    window.localStorage.removeItem(PENDING_STORAGE_KEY);
  },

  getAll(query: EventListQuery = {}): PaginatedEventsResponse {
    const events = this.getEvents();
    const filteredEvents = filterEventsByQuery(events, query);
    return paginateEvents(filteredEvents, query);
  },

  getById(id: number): EventItem {
    const event = this.getEvents().find((currentEvent) => currentEvent.id === id);
    if (!event) throw new Error("Event not found.");
    return cloneEvent(event);
  },

  add(data: CreateEventInput): EventItem {
    const events = this.getEvents();
    const tempId = getNextTempId();

    const newEvent: EventItem = {
      id: tempId,
      title: data.title,
      sport: data.sport,
      city: data.city,
      location: data.location,
      date: data.date,
      startTime: data.startTime,
      duration: data.duration,
      maxParticipants: data.maxParticipants,
      currentParticipants: data.participants.length,
      description: data.description,
      participants: [...data.participants],
    };

    this.setEvents([...events, newEvent]);

    const pendingOperations = this.getPendingOperations();
    pendingOperations.push({ type: "add", tempId, payload: { ...data, participants: [...data.participants] } });
    this.setPendingOperations(pendingOperations);
    return cloneEvent(newEvent);
  },

  update(id: number, payload: UpdateEventInput): EventItem {
    const events = this.getEvents();
    const existingEvent = events.find((event) => event.id === id);
    if (!existingEvent) throw new Error("Event not found.");

    const nextParticipants = payload.participants ? [...payload.participants] : [...existingEvent.participants];
    const updatedEvent: EventItem = {
      ...existingEvent,
      ...payload,
      participants: nextParticipants,
      currentParticipants: nextParticipants.length,
    };

    this.setEvents(events.map((event) => (event.id === id ? updatedEvent : event)));

    const pendingOperations = this.getPendingOperations();
    if (id < 0) {
      const addOperation = pendingOperations.find(
        (op): op is Extract<PendingOperation, { type: "add" }> =>
          op.type === "add" && op.tempId === id
      );
      if (addOperation) {
        addOperation.payload = { ...addOperation.payload, ...payload, participants: [...nextParticipants] };
      }
    } else {
      pendingOperations.push({ type: "update", id, payload: { ...payload, participants: [...nextParticipants] } });
    }

    this.setPendingOperations(pendingOperations);
    return cloneEvent(updatedEvent);
  },

  remove(id: number): void {
    const events = this.getEvents();
    const existingEvent = events.find((event) => event.id === id);
    if (!existingEvent) throw new Error("Event not found.");

    this.setEvents(events.filter((event) => event.id !== id));

    let pendingOperations = this.getPendingOperations();
    if (id < 0) {
      pendingOperations = pendingOperations.filter((op) => {
        if (op.type === "add" && op.tempId === id) return false;
        if ("id" in op && op.id === id) return false;
        return true;
      });
    } else {
      pendingOperations.push({ type: "remove", id });
    }

    this.setPendingOperations(pendingOperations);
  },

  join(id: number, userName: string): EventItem {
    const event = this.getById(id);
    if (event.participants.includes(userName)) throw new Error("User already joined this event.");
    if (event.currentParticipants >= event.maxParticipants) throw new Error("Event is full.");
    return this.update(id, { participants: [...event.participants, userName] });
  },

  leave(id: number, userName: string): EventItem {
    const event = this.getById(id);
    if (!event.participants.includes(userName)) throw new Error("User is not part of this event.");
    return this.update(id, {
      participants: event.participants.filter((p) => p !== userName),
    });
  },

  toggleParticipation(event: EventItem, userName: string): EventItem {
    const isJoined = event.participants.includes(userName);
    return isJoined ? this.leave(event.id, userName) : this.join(event.id, userName);
  },

  getStatistics(): StatisticsData {
    return buildStatistics(this.getEvents());
  },
};
