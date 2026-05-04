export const typeDefs = `#graphql

  # ─── Event ──────────────────────────────────────────────────────────────
  type EventItem {
    id: Int!
    createdByUserId: Int
    createdByDisplayName: String
    title: String!
    sport: String!
    city: String!
    date: String!
    startTime: String!
    duration: String!
    location: String!
    maxParticipants: Int!
    currentParticipants: Int!
    description: String!
    participants: [String!]!
    comments: [Comment!]!
  }

  type PaginatedEvents {
    items: [EventItem!]!
    page: Int!
    limit: Int!
    totalItems: Int!
    totalPages: Int!
  }

  input CreateEventInput {
    title: String!
    sport: String!
    city: String!
    date: String!
    startTime: String!
    duration: String!
    location: String!
    maxParticipants: Int!
    description: String!
    participants: [String!]!
  }

  input UpdateEventInput {
    title: String
    sport: String
    city: String
    date: String
    startTime: String
    duration: String
    location: String
    maxParticipants: Int
    description: String
    participants: [String!]
  }

  # ─── Comment ─────────────────────────────────────────────────────────────
  type Comment {
    id: Int!
    eventId: Int!
    author: String!
    content: String!
    createdAt: String!
  }

  input CreateCommentInput {
    eventId: Int!
    author: String!
    content: String!
  }

  input UpdateCommentInput {
    content: String!
  }

  # ─── Statistics ───────────────────────────────────────────────────────────
  type SportCount {
    sport: String!
    count: Int!
  }

  type LocationCount {
    location: String!
    count: Int!
  }

  type DateCount {
    date: String!
    count: Int!
  }

  type EventCommentCount {
    eventId: Int!
    eventTitle: String!
    count: Int!
  }

  type CommentStats {
    totalComments: Int!
    commentsPerEvent: [EventCommentCount!]!
    mostCommentedEvents: [EventCommentCount!]!
  }

  type Statistics {
    sports: [SportCount!]!
    locations: [LocationCount!]!
    dates: [DateCount!]!
    comments: CommentStats!
  }

  # ─── Generator ────────────────────────────────────────────────────────────
  type GeneratorStatus {
    running: Boolean!
    batchSize: Int!
    intervalMs: Int!
  }

  # ─── Queries ──────────────────────────────────────────────────────────────
  type Query {
    events(
      page: Int
      limit: Int
      sport: String
      date: String
      location: String
      joinedOnly: Boolean
      user: String
      createdByUserId: Int
    ): PaginatedEvents!

    event(id: Int!): EventItem

    statistics: Statistics!

    generatorStatus: GeneratorStatus!

    commentsByEvent(eventId: Int!): [Comment!]!
  }

  # ─── Mutations ────────────────────────────────────────────────────────────
  type Mutation {
    createEvent(input: CreateEventInput!): EventItem!
    updateEvent(id: Int!, input: UpdateEventInput!): EventItem!
    deleteEvent(id: Int!): Boolean!
    joinEvent(id: Int!, userName: String!): EventItem!
    leaveEvent(id: Int!, userName: String!): EventItem!

    startGenerator(batchSize: Int, intervalMs: Int): GeneratorStatus!
    stopGenerator: GeneratorStatus!

    createComment(input: CreateCommentInput!): Comment!
    updateComment(id: Int!, input: UpdateCommentInput!): Comment!
    deleteComment(id: Int!): Boolean!
  }
`;
