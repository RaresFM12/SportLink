import type { EventItem } from "../types/event";
import { gqlRequest, NetworkError } from "./graphqlClient";

export type CreateEventInput = Omit<EventItem, "id" | "currentParticipants"> & {
  currentParticipants?: number;
};

export type UpdateEventInput = Partial<
  Omit<EventItem, "id" | "currentParticipants">
> & {
  currentParticipants?: number;
  participants?: string[];
};

export type EventListQuery = {
  page?: number;
  limit?: number;
  sport?: string;
  date?: string;
  location?: string;
  joinedOnly?: boolean;
  user?: string;
};

export type PaginatedEventsResponse = {
  items: EventItem[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type StatisticsData = {
  sports: { sport: string; count: number }[];
  locations: { location: string; count: number }[];
  dates: { date: string; count: number }[];
  comments: {
    totalComments: number;
    commentsPerEvent: { eventId: number; eventTitle: string; count: number }[];
    mostCommentedEvents: { eventId: number; eventTitle: string; count: number }[];
  };
};

export type GeneratorStatusResponse = {
  running: boolean;
  batchSize: number;
  intervalMs: number;
};

// Fields fetched for list views (no comments — keep payloads small)
const EVENT_FIELDS = `
  id title sport city date startTime duration location
  maxParticipants currentParticipants description participants
`;

// Fields fetched for detail view — includes comments
const EVENT_DETAIL_FIELDS = `
  id title sport city date startTime duration location
  maxParticipants currentParticipants description participants
  comments { id eventId author content createdAt }
`;

/**
 * Returns true when the error is a network/connectivity failure and the app
 * should fall back to the offline store. GraphQL domain errors (404, 409, 400)
 * must NOT trigger offline mode — they are real server responses.
 */
export function shouldUseOfflineFallback(error: unknown): boolean {
  if (!navigator.onLine) return true;
  // Our own NetworkError class — fetch failed or HTTP 5xx
  if (error instanceof NetworkError) return true;
  // Native fetch failure before our wrapper had a chance to wrap it
  if (error instanceof TypeError) return true;
  return false;
}

export const eventService = {
  async getAll(query: EventListQuery = {}): Promise<PaginatedEventsResponse> {
    const data = await gqlRequest<{ events: PaginatedEventsResponse }>(
      `query GetEvents(
        $page: Int, $limit: Int, $sport: String, $date: String,
        $location: String, $joinedOnly: Boolean, $user: String
      ) {
        events(page: $page, limit: $limit, sport: $sport, date: $date,
               location: $location, joinedOnly: $joinedOnly, user: $user) {
          items { ${EVENT_FIELDS} }
          page limit totalItems totalPages
        }
      }`,
      {
        page: query.page,
        limit: query.limit,
        sport: query.sport && query.sport !== "all" ? query.sport : undefined,
        date: query.date || undefined,
        location: query.location || undefined,
        joinedOnly: query.joinedOnly ?? false,
        user: query.user,
      }
    );
    return data.events;
  },

  async getById(id: number): Promise<EventItem> {
    const data = await gqlRequest<{ event: EventItem | null }>(
      // Fetches comments as part of the event so the detail page has them
      // immediately without a second round-trip.
      `query GetEvent($id: Int!) {
        event(id: $id) { ${EVENT_DETAIL_FIELDS} }
      }`,
      { id }
    );
    if (!data.event) throw new Error("Event not found.");
    return data.event;
  },

  async add(input: CreateEventInput): Promise<EventItem> {
    const data = await gqlRequest<{ createEvent: EventItem }>(
      `mutation CreateEvent($input: CreateEventInput!) {
        createEvent(input: $input) { ${EVENT_FIELDS} }
      }`,
      { input }
    );
    return data.createEvent;
  },

  async update(id: number, updatedFields: UpdateEventInput): Promise<EventItem> {
    const data = await gqlRequest<{ updateEvent: EventItem }>(
      `mutation UpdateEvent($id: Int!, $input: UpdateEventInput!) {
        updateEvent(id: $id, input: $input) { ${EVENT_FIELDS} }
      }`,
      { id, input: updatedFields }
    );
    return data.updateEvent;
  },

  async remove(id: number): Promise<void> {
    await gqlRequest<{ deleteEvent: boolean }>(
      `mutation DeleteEvent($id: Int!) { deleteEvent(id: $id) }`,
      { id }
    );
  },

  async join(id: number, userName: string): Promise<EventItem> {
    const data = await gqlRequest<{ joinEvent: EventItem }>(
      `mutation JoinEvent($id: Int!, $userName: String!) {
        joinEvent(id: $id, userName: $userName) { ${EVENT_FIELDS} }
      }`,
      { id, userName }
    );
    return data.joinEvent;
  },

  async leave(id: number, userName: string): Promise<EventItem> {
    const data = await gqlRequest<{ leaveEvent: EventItem }>(
      `mutation LeaveEvent($id: Int!, $userName: String!) {
        leaveEvent(id: $id, userName: $userName) { ${EVENT_FIELDS} }
      }`,
      { id, userName }
    );
    return data.leaveEvent;
  },

  async toggleParticipation(event: EventItem, userName: string): Promise<EventItem> {
    const isJoined = event.participants.includes(userName);
    return isJoined ? this.leave(event.id, userName) : this.join(event.id, userName);
  },

  async getStatistics(): Promise<StatisticsData> {
    const data = await gqlRequest<{ statistics: StatisticsData }>(
      `query GetStatistics {
        statistics {
          sports { sport count }
          locations { location count }
          dates { date count }
          comments {
            totalComments
            commentsPerEvent { eventId eventTitle count }
            mostCommentedEvents { eventId eventTitle count }
          }
        }
      }`
    );
    return data.statistics;
  },

  async getGeneratorStatus(): Promise<GeneratorStatusResponse> {
    const data = await gqlRequest<{ generatorStatus: GeneratorStatusResponse }>(
      `query GeneratorStatus { generatorStatus { running batchSize intervalMs } }`
    );
    return data.generatorStatus;
  },

  async startGenerator(batchSize = 3, intervalMs = 4000): Promise<GeneratorStatusResponse> {
    const data = await gqlRequest<{ startGenerator: GeneratorStatusResponse }>(
      `mutation StartGenerator($batchSize: Int, $intervalMs: Int) {
        startGenerator(batchSize: $batchSize, intervalMs: $intervalMs) {
          running batchSize intervalMs
        }
      }`,
      { batchSize, intervalMs }
    );
    return data.startGenerator;
  },

  async stopGenerator(): Promise<GeneratorStatusResponse> {
    const data = await gqlRequest<{ stopGenerator: GeneratorStatusResponse }>(
      `mutation StopGenerator { stopGenerator { running batchSize intervalMs } }`
    );
    return data.stopGenerator;
  },
};
