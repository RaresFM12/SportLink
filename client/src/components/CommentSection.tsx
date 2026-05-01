import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Pencil, Trash2, Send, X, Check, WifiOff } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import type { Comment } from "../types/event";
import { commentService } from "../services/commentService";
import { GraphQLError } from "../services/graphqlClient";

type Props = {
  eventId: number;
  currentUser: string;
  /**
   * Comments already fetched as part of the event detail query.
   * If provided, we skip the initial network request and use these directly.
   */
  initialComments?: Comment[];
};

type CommentError =
  | { kind: "offline" }
  | { kind: "server"; message: string };

export function CommentSection({ eventId, currentUser, initialComments }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments ?? []);
  const [loading, setLoading] = useState(initialComments === undefined);
  const [fetchError, setFetchError] = useState<CommentError | null>(null);
  const [actionError, setActionError] = useState<CommentError | null>(null);

  // New comment form
  const [newContent, setNewContent] = useState("");
  const [newAuthor, setNewAuthor] = useState(currentUser);
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  // Track whether we already have data so we don't double-fetch on re-render
  const hasFetchedRef = useRef(initialComments !== undefined);

  const fetchComments = useCallback(async () => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    setLoading(true);
    setFetchError(null);

    try {
      const fetched = await commentService.getByEventId(eventId);
      setComments(fetched);
    } catch (err) {
      if (!navigator.onLine || !(err instanceof GraphQLError)) {
        // True network failure
        setFetchError({ kind: "offline" });
      } else {
        setFetchError({ kind: "server", message: err.message });
      }
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  // ── helpers ────────────────────────────────────────────────────────────

  const isOfflineError = (err: unknown): boolean =>
    !navigator.onLine || !(err instanceof GraphQLError);

  const handleSubmit = async () => {
    const trimmedContent = newContent.trim();
    const trimmedAuthor = newAuthor.trim();
    if (!trimmedContent || !trimmedAuthor) return;

    setSubmitting(true);
    setActionError(null);

    try {
      const created = await commentService.create({
        eventId,
        author: trimmedAuthor,
        content: trimmedContent,
      });
      setComments((prev) => [...prev, created]);
      setNewContent("");
    } catch (err) {
      if (isOfflineError(err)) {
        setActionError({ kind: "offline" });
      } else {
        setActionError({
          kind: "server",
          message: err instanceof Error ? err.message : "Failed to add comment.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id: number) => {
    const trimmed = editContent.trim();
    if (!trimmed) return;

    setActionError(null);

    try {
      const updated = await commentService.update(id, trimmed);
      setComments((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingId(null);
      setEditContent("");
    } catch (err) {
      if (isOfflineError(err)) {
        setActionError({ kind: "offline" });
      } else {
        setActionError({
          kind: "server",
          message: err instanceof Error ? err.message : "Failed to update comment.",
        });
      }
    }
  };

  const handleDelete = async (id: number) => {
    setActionError(null);
    try {
      await commentService.remove(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      if (isOfflineError(err)) {
        setActionError({ kind: "offline" });
      } else {
        setActionError({
          kind: "server",
          message: err instanceof Error ? err.message : "Failed to delete comment.",
        });
      }
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
    setActionError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
    setActionError(null);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const renderError = (err: CommentError) =>
    err.kind === "offline" ? (
      <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>You are offline. Comments cannot be loaded or changed right now.</span>
      </div>
    ) : (
      <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
        {err.message}
      </div>
    );

  // ── render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 border-t border-gray-100 pt-2">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-blue-600" />
        <h3 className="text-2xl font-semibold text-gray-900">
          Comments{comments.length > 0 ? ` (${comments.length})` : ""}
        </h3>
      </div>

      {fetchError && renderError(fetchError)}
      {actionError && renderError(actionError)}

      {/* Compose area — hidden when offline fetch failed */}
      {fetchError?.kind !== "offline" && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Add a comment</p>
          <Input
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
            placeholder="Your name"
            className="bg-white border-gray-300 text-sm"
          />
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Write your comment…"
            rows={3}
            className="bg-white border-gray-300 text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                void handleSubmit();
              }
            }}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => void handleSubmit()}
              disabled={submitting || !newContent.trim() || !newAuthor.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {submitting ? "Posting…" : "Post Comment"}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-gray-500 py-4 text-center">Loading comments…</p>
      ) : !fetchError && comments.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                    {comment.author.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-gray-800">{comment.author}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(comment)}
                    className="h-7 w-7 p-0 hover:bg-gray-100"
                    title="Edit comment"
                  >
                    <Pencil className="h-3.5 w-3.5 text-gray-500" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleDelete(comment.id)}
                    className="h-7 w-7 p-0 hover:bg-red-50"
                    title="Delete comment"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 pl-10">
                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="text-sm border-gray-300 resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        className="text-xs hover:bg-gray-100"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void handleEdit(comment.id)}
                        disabled={!editContent.trim()}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {comment.content}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
