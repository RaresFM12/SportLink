export interface EventItem {
  id: number;
  createdByUserId?: number | null;
  createdByDisplayName?: string | null;
  title: string;
  sport: string;
  city: string;
  date: string;
  startTime: string;
  duration: string;
  location: string;
  maxParticipants: number;
  currentParticipants: number;
  description: string;
  participants: string[];
}

export type CreateEventInput = Omit<EventItem, 'id' | 'currentParticipants'> & {
  currentParticipants?: number;
};

export type UpdateEventInput = Partial<CreateEventInput>;

export interface EventFilters {
  sport?: string;
  date?: string;
  location?: string;
  joinedOnly?: boolean;
  user?: string;
  createdByUserId?: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface CommentStats {
  totalComments: number;
  commentsPerEvent: Array<{ eventId: number; eventTitle: string; count: number }>;
  mostCommentedEvents: Array<{ eventId: number; eventTitle: string; count: number }>;
}

export interface StatisticsResponse {
  sports: Array<{ sport: string; count: number }>;
  locations: Array<{ location: string; count: number }>;
  dates: Array<{ date: string; count: number }>;
  comments: CommentStats;
}
