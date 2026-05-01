import type { Comment } from "../types/event";
import { gqlRequest } from "./graphqlClient";

const COMMENT_FIELDS = `id eventId author content createdAt`;

export const commentService = {
  async getByEventId(eventId: number): Promise<Comment[]> {
    const data = await gqlRequest<{ commentsByEvent: Comment[] }>(
      `query CommentsByEvent($eventId: Int!) {
        commentsByEvent(eventId: $eventId) { ${COMMENT_FIELDS} }
      }`,
      { eventId }
    );
    return data.commentsByEvent;
  },

  async create(input: { eventId: number; author: string; content: string }): Promise<Comment> {
    const data = await gqlRequest<{ createComment: Comment }>(
      `mutation CreateComment($input: CreateCommentInput!) {
        createComment(input: $input) { ${COMMENT_FIELDS} }
      }`,
      { input }
    );
    return data.createComment;
  },

  async update(id: number, content: string): Promise<Comment> {
    const data = await gqlRequest<{ updateComment: Comment }>(
      `mutation UpdateComment($id: Int!, $input: UpdateCommentInput!) {
        updateComment(id: $id, input: $input) { ${COMMENT_FIELDS} }
      }`,
      { id, input: { content } }
    );
    return data.updateComment;
  },

  async remove(id: number): Promise<void> {
    await gqlRequest<{ deleteComment: boolean }>(
      `mutation DeleteComment($id: Int!) { deleteComment(id: $id) }`,
      { id }
    );
  },
};
