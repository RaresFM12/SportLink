export interface Comment {
  id: number;
  eventId: number;
  author: string;
  content: string;
  createdAt: string;
}

export type CreateCommentInput = {
  eventId: number;
  author: string;
  content: string;
};

export type UpdateCommentInput = {
  content: string;
};

export interface CommentStats {
  totalComments: number;
  commentsPerEvent: Array<{ eventId: number; eventTitle: string; count: number }>;
  mostCommentedEvents: Array<{ eventId: number; eventTitle: string; count: number }>;
}
