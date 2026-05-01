import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Eye, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { useEvents } from "../context/EventsContext";
import { useVisitTracking } from "../hooks/useVisitTracking";
import { usePageTracking } from "../hooks/usePageTracking";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { savePreferredSport, getPreferredSport } from "../utils/activityTracking";
import { motion } from "framer-motion";

const CURRENT_USER = "Rares";
const PAGE_LIMIT = 10;
const LOCATION_DEBOUNCE_MS = 350;

export function EventsListPage() {
  useVisitTracking();
  usePageTracking("events-list");

  const location = useLocation();
  const navigate = useNavigate();
  const isMyEvents = location.pathname === "/my-events";

  const {
    events,
    loading,
    error,
    hasMore,
    fetchEvents,
    fetchMoreEvents,
    resetEvents,
    deleteEvent,
    isOfflineMode,
    pendingOperationsCount,
  } = useEvents();

  const [sport, setSport] = useState(() => getPreferredSport() ?? "all");
  const [date, setDate] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [deleteEventId, setDeleteEventId] = useState<number | null>(null);

  // Keep a ref to the latest filter values so effects and callbacks always
  // read the current values without creating new function references.
  const filtersRef = useRef({ sport, date, location: locationFilter, isMyEvents });
  filtersRef.current = { sport, date, location: locationFilter, isMyEvents };

  // Keep stable refs to context functions so effects can list [] as deps
  // without going stale.
  const fetchEventsRef = useRef(fetchEvents);
  const fetchMoreEventsRef = useRef(fetchMoreEvents);
  const resetEventsRef = useRef(resetEvents);
  useEffect(() => { fetchEventsRef.current = fetchEvents; });
  useEffect(() => { fetchMoreEventsRef.current = fetchMoreEvents; });
  useEffect(() => { resetEventsRef.current = resetEvents; });

  // ── canonical load-from-page-1 ─────────────────────────────────────────
  // Reads from filtersRef so it never needs to be in a dependency array.
  const loadFirstPage = (overrides?: Partial<typeof filtersRef.current>) => {
    const f = { ...filtersRef.current, ...overrides };
    resetEventsRef.current();
    fetchEventsRef.current({
      page: 1,
      limit: PAGE_LIMIT,
      sport: f.sport,
      date: f.date,
      location: f.location,
      joinedOnly: f.isMyEvents,
      user: f.isMyEvents ? CURRENT_USER : undefined,
    }).catch(() => undefined);
  };

  // ── mount: load first page exactly once ───────────────────────────────
  useEffect(() => {
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── re-fetch when switching between /events and /my-events ────────────
  const prevIsMyEventsRef = useRef(isMyEvents);
  useEffect(() => {
    if (prevIsMyEventsRef.current === isMyEvents) return;
    prevIsMyEventsRef.current = isMyEvents;
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyEvents]);

  // ── debounce timer for location input ─────────────────────────────────
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    };
  }, []);

  // ── filter handlers ───────────────────────────────────────────────────
  const handleSportChange = (value: string) => {
    setSport(value);
    savePreferredSport(value);
    loadFirstPage({ sport: value });
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    loadFirstPage({ date: value });
  };

  const handleLocationChange = (value: string) => {
    setLocationFilter(value);
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    locationDebounceRef.current = setTimeout(() => {
      loadFirstPage({ location: value });
    }, LOCATION_DEBOUNCE_MS);
  };

  // ── infinite scroll ───────────────────────────────────────────────────
  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: () => void fetchMoreEventsRef.current(),
    loading,
    hasMore,
  });

  // ── delete ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (deleteEventId === null) return;
    try {
      await deleteEvent(deleteEventId);
    } finally {
      setDeleteEventId(null);
    }
  };

  // ── render ────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          {isMyEvents ? "My Events" : "All Events"}
        </h1>

        <Link
          to="/events/new"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white transition-all duration-200 hover:scale-[1.02] hover:bg-blue-700 hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          <span>Create Event</span>
        </Link>
      </div>

      {isOfflineMode && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">
          Offline mode is active.
          {pendingOperationsCount > 0
            ? ` ${pendingOperationsCount} change(s) will sync when the connection is restored.`
            : " Local data is being shown."}
        </div>
      )}

      {/* Filters */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="font-bold">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Sport</Label>
              <Select value={sport} onValueChange={handleSportChange}>
                <SelectTrigger className="bg-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Sports</SelectItem>
                  <SelectItem value="Football">Football</SelectItem>
                  <SelectItem value="Basketball">Basketball</SelectItem>
                  <SelectItem value="Tennis">Tennis</SelectItem>
                  <SelectItem value="Volleyball">Volleyball</SelectItem>
                  <SelectItem value="Baseball">Baseball</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="bg-gray-100"
              />
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={locationFilter}
                onChange={(e) => handleLocationChange(e.target.value)}
                placeholder="Search by location or city"
                className="bg-gray-100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events table */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="font-bold">
            {isMyEvents ? "Joined Events" : "Events"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {loading && events.length === 0 && (
            <div className="py-8 text-center text-gray-500">Loading events...</div>
          )}

          {!loading && events.length === 0 && (
            <div className="py-8 text-center text-gray-500">No events found.</div>
          )}

          {events.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>{event.sport}</TableCell>
                    <TableCell>{event.date}</TableCell>
                    <TableCell>
                      {event.location}, {event.city}
                    </TableCell>
                    <TableCell>
                      {event.currentParticipants}/{event.maxParticipants}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/events/${event.id}`)}
                          className="transition-all duration-200 hover:scale-[1.02] hover:bg-gray-100 hover:shadow-md"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/events/${event.id}/edit`)}
                          className="transition-all duration-200 hover:scale-[1.02] hover:bg-gray-100 hover:shadow-md"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteEventId(event.id)}
                          className="transition-all duration-200 hover:scale-[1.02] hover:bg-gray-100 hover:shadow-md"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Invisible sentinel — IntersectionObserver target */}
          <div ref={sentinelRef} aria-hidden="true" className="h-1" />

          {loading && events.length > 0 && (
            <div className="py-4 text-center text-sm text-gray-400">
              Loading more events…
            </div>
          )}

          {!hasMore && !loading && events.length > 0 && (
            <div className="py-3 text-center text-sm text-gray-400">
              All {events.length} event{events.length !== 1 ? "s" : ""} loaded
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteEventId} onOpenChange={() => setDeleteEventId(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
