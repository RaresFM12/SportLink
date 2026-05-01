const GRAPHQL_URL = "http://localhost:3001/graphql";

export type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
};

/**
 * Thrown when the fetch itself failed (no network, server unreachable).
 * shouldUseOfflineFallback checks for this class.
 */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : "Network request failed");
    this.name = "NetworkError";
  }
}

/**
 * Thrown when the server responded but GraphQL returned errors.
 * These should NOT trigger offline fallback — they are domain errors.
 */
export class GraphQLError extends Error {
  readonly code: string | undefined;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "GraphQLError";
    this.code = code;
  }
}

export async function gqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
  } catch (err) {
    throw new NetworkError(err);
  }

  if (!response.ok) {
    throw new NetworkError(`HTTP ${response.status}`);
  }

  const json = (await response.json()) as GraphQLResponse<T>;

  if (json.errors && json.errors.length > 0) {
    const first = json.errors[0];
    throw new GraphQLError(first.message, first.extensions?.code);
  }

  if (json.data === undefined) {
    throw new GraphQLError("No data returned from GraphQL.");
  }

  return json.data;
}