import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { EventItem } from "../types/event";
import {
  eventService,
  shouldUseOfflineFallback,
  type CreateEventInput,
  type EventListQuery,
  type PaginatedEventsResponse,
  type StatisticsData,
  type UpdateEventInput,
} from "../services/eventService";
import { offlineEvents } from "../services/offlineEvents";
import { isServerReachable, syncPendingOperations } from "../services/syncService";

type EventsContextValue = {
  events: EventItem[];
  loading: boolean;
  error: string;
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
  selectedEvent: EventItem | null;
  selectedEventLoading: boolean;
  statistics: StatisticsData | null;
  statisticsLoading: boolean;
  isOfflineMode: boolean;
  pendingOperationsCount: number;
  generatorRunning: boolean;
  fetchEvents: (query?: EventListQuery) => Promise<PaginatedEventsResponse>;
  fetchMoreEvents: () => Promise<void>;
  resetEvents: () => void;
  fetchEventById: (id: number) => Promise<EventItem>;
  getEventById: (id: number) => EventItem | undefined;
  addEvent: (data: CreateEventInput) => Promise<EventItem>;
  updateEvent: (id: number, data: UpdateEventInput) => Promise<EventItem>;
  deleteEvent: (id: number) => Promise<void>;
  toggleParticipation: (eventId: number, userName: string) => Promise<EventItem>;
  fetchStatistics: () => Promise<StatisticsData>;
  startGenerator: (batchSize?: number, intervalMs?: number) => Promise<void>;
  stopGenerator: () => Promise<void>;
};

const EventsContext = createContext<EventsContextValue | undefined>(undefined);

export function EventsProvider({ children }: { children: ReactNode }) {
  const initialOfflineItems = offlineEvents.getEvents();

  const [events, setEvents] = useState<EventItem[]>(initialOfflineItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(initialOfflineItems.length);
  const [totalPages, setTotalPages] = useState(
    initialOfflineItems.length === 0 ? 1 : Math.ceil(initialOfflineItems.length / 10)
  );
  const [hasMore, setHasMore] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedEventLoading, setSelectedEventLoading] = useState(false);

  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [pendingOperationsCount, setPendingOperationsCount] = useState(
    offlineEvents.getPendingOperations().length
  );
  const [generatorRunning, setGeneratorRunning] = useState(false);

  /**
   * lastQuery holds the most recent filter+pagination query used by fetchEvents.
   * It is stored in a ref (not state) so that fetchMoreEvents and prefetch can
   * always read the latest value without causing re-renders or stale closures.
   */
  const lastQueryRef = useRef<EventListQuery>({ page: 1, limit: 10 });

  /**
   * currentPageRef mirrors the `page` state but is readable synchronously
   * inside fetchMoreEvents without relying on React state (avoids stale closure).
   */
  const currentPageRef = useRef(1);

  /**
   * totalPagesRef mirrors totalPages for the same reason.
   */
  const totalPagesRef = useRef(1);

  /**
   * Guards against two concurrent fetchMore calls racing each other.
   * Using a ref instead of state means toggling it never causes a re-render.
   */
  const fetchingMoreRef = useRef(false);

  /**
   * Holds the prefetched next-page response so that when the user actually
   * scrolls to trigger fetchMoreEvents we can resolve instantly from cache.
   */
  const prefetchCacheRef = useRef<PaginatedEventsResponse | null>(null);
  const prefetchPageRef = useRef<number | null>(null);

  // ── helpers ─────────────────────────────────────────────────────────────

  const refreshPendingOperationsCount = useCallback(() => {
    setPendingOperationsCount(offlineEvents.getPendingOperations().length);
  }, []);

  const refreshOfflineCache = useCallback((items: EventItem[]) => {
    offlineEvents.replaceAll(items);
  }, []);

  /** Update the two page-tracking refs whenever state changes. */
  const applyPageMeta = (responsePage: number, responseLimit: number, responseTotalPages: number) => {
    const tp = Math.max(1, responseTotalPages);
    currentPageRef.current = responsePage;
    totalPagesRef.current = tp;
    setPage(responsePage);
    setLimit(responseLimit);
    setTotalPages(tp);
    setHasMore(responsePage < tp);
  };

  // ── prefetching ─────────────────────────────────────────────────────────

  /**
   * Prefetches page N+1 silently in the background after the current page
   * has been loaded.  The result is cached in prefetchCacheRef.
   */
  const prefetchNextPage = useCallback(async (loadedPage: number, query: EventListQuery) => {
    const nextPage = loadedPage + 1;
    if (nextPage > totalPagesRef.current) return; // nothing to prefetch

    // Don't double-prefetch the same page
    if (prefetchPageRef.current === nextPage) return;

    try {
      const prefetchQuery = { ...query, page: nextPage };
      const response = await eventService.getAll(prefetchQuery);
      prefetchCacheRef.current = response;
      prefetchPageRef.current = nextPage;
    } catch {
      // prefetch failures are silent — the real fetch will retry
    }
  }, []);

  // ── trySyncNow ───────────────────────────────────────────────────────────

  const trySyncNow = useCallback(async () => {
    if (offlineEvents.getPendingOperations().length === 0) return;

    const reachable = await isServerReachable();
    if (!reachable) return;

    try {
      const syncedEvents = await syncPendingOperations();
      setIsOfflineMode(false);
      setError("");
      refreshOfflineCache(syncedEvents);
      setPendingOperationsCount(0);
      setTotalItems(syncedEvents.length);

      if (selectedEvent) {
        const refreshed = syncedEvents.find((e) => e.id === selectedEvent.id) ?? null;
        setSelectedEvent(refreshed);
      }

      try {
        const refreshedStats = await eventService.getStatistics();
        setStatistics(refreshedStats);
      } catch {
        // ignore statistics refresh failure
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sync offline changes.";
      setError(message);
    }
  }, [refreshOfflineCache, selectedEvent]);

  // ── fetchEvents (page 1 / filter change) ────────────────────────────────

  const fetchEvents = useCallback(
    async (query: EventListQuery = {}): Promise<PaginatedEventsResponse> => {
      // Always reset to page 1 when fetchEvents is called (filter change or initial load)
      const normalizedQuery: EventListQuery = { ...query, page: 1, limit: query.limit ?? 10 };
      lastQueryRef.current = normalizedQuery;

      // Invalidate the prefetch cache — filters have changed
      prefetchCacheRef.current = null;
      prefetchPageRef.current = null;

      setLoading(true);
      setError("");

      try {
        const response = await eventService.getAll(normalizedQuery);
        setIsOfflineMode(false);
        refreshOfflineCache(response.items);
        setEvents(response.items);
        setTotalItems(response.totalItems);
        applyPageMeta(response.page, response.limit, response.totalPages);

        // Kick off prefetch for page 2 in the background
        void prefetchNextPage(response.page, normalizedQuery);

        return response;
      } catch (err) {
        if (!shouldUseOfflineFallback(err)) {
          const message = err instanceof Error ? err.message : "Failed to load events.";
          setError(message);
          throw err;
        }

        const response = offlineEvents.getAll(normalizedQuery);
        setIsOfflineMode(true);
        setEvents(response.items);
        setTotalItems(response.totalItems);
        applyPageMeta(response.page, response.limit, response.totalPages);
        setError("Offline mode: showing local events.");
        return response;
      } finally {
        setLoading(false);
      }
    },
    [prefetchNextPage, refreshOfflineCache]
  );

  // ── fetchMoreEvents (append next page) ───────────────────────────────────

  /**
   * Appends the next page of events to the current list.
   *
   * Design:
   * 1. Guard with fetchingMoreRef — drops duplicate calls from IntersectionObserver.
   * 2. Calculate nextPage from currentPageRef (synchronous, no stale closure risk).
   * 3. Check prefetchCacheRef first — if the page is already there, resolve
   *    instantly with zero network cost.
   * 4. After appending, prefetch the page after that in the background.
   */
  const fetchMoreEvents = useCallback(async (): Promise<void> => {
    // Guard: already fetching, or no more pages
    if (fetchingMoreRef.current) return;
    if (currentPageRef.current >= totalPagesRef.current) return;

    const nextPage = currentPageRef.current + 1;
    const nextQuery: EventListQuery = { ...lastQueryRef.current, page: nextPage };

    fetchingMoreRef.current = true;
    setLoading(true);

    try {
      let response: PaginatedEventsResponse;

      // Use prefetch cache if it covers the page we need
      if (
        prefetchCacheRef.current !== null &&
        prefetchPageRef.current === nextPage
      ) {
        response = prefetchCacheRef.current;
        // Clear the cache entry so it isn't reused
        prefetchCacheRef.current = null;
        prefetchPageRef.current = null;
      } else {
        response = await eventService.getAll(nextQuery);
      }

      setIsOfflineMode(false);
      setEvents((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const fresh = response.items.filter((e) => !existingIds.has(e.id));
        return [...prev, ...fresh];
      });
      setTotalItems(response.totalItems);
      applyPageMeta(response.page, response.limit, response.totalPages);

      // Prefetch the page after this one
      void prefetchNextPage(response.page, lastQueryRef.current);
    } catch (err) {
      if (shouldUseOfflineFallback(err)) {
        setIsOfflineMode(true);
        setError("Offline mode: showing local events.");
      } else {
        const message = err instanceof Error ? err.message : "Failed to load more events.";
        setError(message);
      }
    } finally {
      setLoading(false);
      fetchingMoreRef.current = false;
    }
  }, [prefetchNextPage]);

  // ── resetEvents ──────────────────────────────────────────────────────────

  const resetEvents = useCallback(() => {
    setEvents([]);
    setPage(1);
    setHasMore(false);
    currentPageRef.current = 1;
    fetchingMoreRef.current = false;
    prefetchCacheRef.current = null;
    prefetchPageRef.current = null;
  }, []);

  // ── fetchEventById ───────────────────────────────────────────────────────

  const fetchEventById = useCallback(async (id: number) => {
    setSelectedEventLoading(true);
    setError("");

    try {
      const event = await eventService.getById(id);
      setIsOfflineMode(false);
      setSelectedEvent(event);
      return event;
    } catch (err) {
      if (!shouldUseOfflineFallback(err)) {
        const message = err instanceof Error ? err.message : "Failed to load event.";
        setError(message);
        setSelectedEvent(null);
        throw err;
      }

      const event = offlineEvents.getById(id);
      setIsOfflineMode(true);
      setSelectedEvent(event);
      setError("Offline mode: showing local event.");
      return event;
    } finally {
      setSelectedEventLoading(false);
    }
  }, []);

  const getEventById = useCallback(
    (id: number) => events.find((e) => e.id === id),
    [events]
  );

  // ── addEvent ─────────────────────────────────────────────────────────────

  const addEvent = useCallback(
    async (data: CreateEventInput) => {
      setError("");
      try {
        const created = await eventService.add(data);
        setIsOfflineMode(false);
        const nextEvents = [...offlineEvents.getEvents(), created];
        refreshOfflineCache(nextEvents);
        setEvents((prev) => [...prev, created]);
        setTotalItems((prev) => prev + 1);
        return created;
      } catch (err) {
        if (!shouldUseOfflineFallback(err)) throw err;
        const created = offlineEvents.add(data);
        setIsOfflineMode(true);
        setEvents((prev) => [...prev, created]);
        setTotalItems((prev) => prev + 1);
        refreshPendingOperationsCount();
        void trySyncNow();
        setError("Offline mode: event saved locally and will sync later.");
        return created;
      }
    },
    [refreshOfflineCache, refreshPendingOperationsCount, trySyncNow]
  );

  // ── updateEvent ──────────────────────────────────────────────────────────

  const updateEvent = useCallback(
    async (id: number, data: UpdateEventInput) => {
      setError("");
      try {
        const updated = await eventService.update(id, data);
        setIsOfflineMode(false);
        const nextEvents = offlineEvents.getEvents().map((e) => (e.id === id ? updated : e));
        refreshOfflineCache(nextEvents);
        setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
        setSelectedEvent(updated);
        return updated;
      } catch (err) {
        if (!shouldUseOfflineFallback(err)) throw err;
        const updated = offlineEvents.update(id, data);
        setIsOfflineMode(true);
        setSelectedEvent(updated);
        setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
        refreshPendingOperationsCount();
        void trySyncNow();
        setError("Offline mode: event updated locally and will sync later.");
        return updated;
      }
    },
    [refreshOfflineCache, refreshPendingOperationsCount, trySyncNow]
  );

  // ── deleteEvent ──────────────────────────────────────────────────────────

  const deleteEvent = useCallback(
    async (id: number) => {
      setError("");
      try {
        await eventService.remove(id);
        setIsOfflineMode(false);
        const nextEvents = offlineEvents.getEvents().filter((e) => e.id !== id);
        refreshOfflineCache(nextEvents);
        setEvents((prev) => prev.filter((e) => e.id !== id));
        setTotalItems((prev) => Math.max(0, prev - 1));
        if (selectedEvent?.id === id) setSelectedEvent(null);
      } catch (err) {
        if (!shouldUseOfflineFallback(err)) throw err;
        offlineEvents.remove(id);
        setIsOfflineMode(true);
        setEvents((prev) => prev.filter((e) => e.id !== id));
        setTotalItems((prev) => Math.max(0, prev - 1));
        if (selectedEvent?.id === id) setSelectedEvent(null);
        refreshPendingOperationsCount();
        void trySyncNow();
        setError("Offline mode: event deleted locally and will sync later.");
      }
    },
    [refreshOfflineCache, refreshPendingOperationsCount, selectedEvent?.id, trySyncNow]
  );

  // ── toggleParticipation ──────────────────────────────────────────────────

  const toggleParticipation = useCallback(
    async (eventId: number, userName: string) => {
      const currentEvent =
        selectedEvent?.id === eventId
          ? selectedEvent
          : events.find((e) => e.id === eventId);
      if (!currentEvent) throw new Error("Event not found.");

      setError("");
      try {
        const updated = await eventService.toggleParticipation(currentEvent, userName);
        setIsOfflineMode(false);
        const nextEvents = offlineEvents.getEvents().map((e) => (e.id === eventId ? updated : e));
        refreshOfflineCache(nextEvents);
        setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
        setSelectedEvent((prev) => (prev?.id === eventId ? updated : prev));
        return updated;
      } catch (err) {
        if (!shouldUseOfflineFallback(err)) throw err;
        const updated = offlineEvents.toggleParticipation(currentEvent, userName);
        setIsOfflineMode(true);
        setSelectedEvent((prev) => (prev?.id === eventId ? updated : prev));
        setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
        refreshPendingOperationsCount();
        void trySyncNow();
        setError("Offline mode: participation updated locally and will sync later.");
        return updated;
      }
    },
    [events, refreshOfflineCache, refreshPendingOperationsCount, selectedEvent, trySyncNow]
  );

  // ── fetchStatistics ──────────────────────────────────────────────────────

  const fetchStatistics = useCallback(async () => {
    setStatisticsLoading(true);
    setError("");
    try {
      const stats = await eventService.getStatistics();
      setIsOfflineMode(false);
      setStatistics(stats);
      return stats;
    } catch (err) {
      if (!shouldUseOfflineFallback(err)) {
        const message = err instanceof Error ? err.message : "Failed to load statistics.";
        setError(message);
        throw err;
      }
      const stats = offlineEvents.getStatistics();
      setIsOfflineMode(true);
      setStatistics(stats);
      setError("Offline mode: showing local statistics. Comment stats unavailable offline.");
      return stats;
    } finally {
      setStatisticsLoading(false);
    }
  }, []);

  // ── generator ────────────────────────────────────────────────────────────

  const startGenerator = useCallback(async (batchSize = 3, intervalMs = 4000) => {
    const response = await eventService.startGenerator(batchSize, intervalMs);
    setGeneratorRunning(response.running);
  }, []);

  const stopGenerator = useCallback(async () => {
    const response = await eventService.stopGenerator();
    setGeneratorRunning(response.running);
  }, []);

  // ── effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchEvents({ page: 1, limit: 10 }).catch(() => undefined);
    fetchStatistics().catch(() => undefined);
    eventService
      .getGeneratorStatus()
      .then((s) => setGeneratorRunning(s.running))
      .catch(() => undefined);
  }, [fetchEvents, fetchStatistics]);

  useEffect(() => {
    const handleOnline = () => void trySyncNow();
    const handleOffline = () => {
      setIsOfflineMode(true);
      setError("Offline mode: changes will be stored locally.");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [trySyncNow]);

  useEffect(() => {
    const id = window.setInterval(() => void trySyncNow(), 3000);
    return () => window.clearInterval(id);
  }, [trySyncNow]);

  useEffect(() => {
    const socket = new WebSocket(`ws://localhost:3001/ws`);

    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as
          | { type: "generator-batch-created"; payload: { batchSize: number; totalEvents: number } }
          | { type: "generator-status"; payload: { running: boolean } };

        if (msg.type === "generator-status") {
          setGeneratorRunning(msg.payload.running);
          return;
        }

        if (msg.type === "generator-batch-created") {
          // Re-fetch page 1 with the current filters so the list is fresh.
          // lastQueryRef always holds the latest query without closure staleness.
          void fetchEvents({ ...lastQueryRef.current, page: 1 }).catch(() => undefined);
          void fetchStatistics().catch(() => undefined);
        }
      } catch {
        // ignore malformed messages
      }
    };

    return () => socket.close();
    // fetchEvents/fetchStatistics are stable callbacks — intentionally omitted
    // from deps to avoid recreating the socket on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── context value ────────────────────────────────────────────────────────

  const value = useMemo<EventsContextValue>(
    () => ({
      events,
      loading,
      error,
      page,
      limit,
      totalItems,
      totalPages,
      hasMore,
      selectedEvent,
      selectedEventLoading,
      statistics,
      statisticsLoading,
      isOfflineMode,
      pendingOperationsCount,
      generatorRunning,
      fetchEvents,
      fetchMoreEvents,
      resetEvents,
      fetchEventById,
      getEventById,
      addEvent,
      updateEvent,
      deleteEvent,
      toggleParticipation,
      fetchStatistics,
      startGenerator,
      stopGenerator,
    }),
    [
      events,
      loading,
      error,
      page,
      limit,
      totalItems,
      totalPages,
      hasMore,
      selectedEvent,
      selectedEventLoading,
      statistics,
      statisticsLoading,
      isOfflineMode,
      pendingOperationsCount,
      generatorRunning,
      fetchEvents,
      fetchMoreEvents,
      resetEvents,
      fetchEventById,
      getEventById,
      addEvent,
      updateEvent,
      deleteEvent,
      toggleParticipation,
      fetchStatistics,
      startGenerator,
      stopGenerator,
    ]
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) throw new Error("useEvents must be used inside an EventsProvider.");
  return context;
}