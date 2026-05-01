import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Calendar, Clock, MapPin, Users, Shuffle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { TeamSplitter } from "../components/TeamSplitter";
import { CommentSection } from "../components/CommentSection";
import { useEvents } from "../context/EventsContext";
import { trackLastViewedEventId } from "../utils/activityTracking";
import { usePageTracking } from "../hooks/usePageTracking";
import type { Comment } from "../types/event";
import { motion } from "framer-motion";

const CURRENT_USER = "Rares";

export function EventDetailsSophisticatedPage() {
  usePageTracking("events-detail");

  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedEvent, selectedEventLoading, fetchEventById, toggleParticipation } =
    useEvents();

  const [showTeamSplitter, setShowTeamSplitter] = useState(false);
  const [actionError, setActionError] = useState("");

  const eventId = Number(id);

  useEffect(() => {
    if (!Number.isFinite(eventId)) return;
    fetchEventById(eventId).catch(() => undefined);
  }, [eventId, fetchEventById]);

  useEffect(() => {
    if (selectedEvent?.id) {
      trackLastViewedEventId(selectedEvent.id);
    }
  }, [selectedEvent]);

  if (selectedEventLoading) {
    return <div className="py-12 text-center text-gray-600">Loading event…</div>;
  }

  if (!selectedEvent || selectedEvent.id !== eventId) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Event not found</p>
        <Button
          onClick={() => navigate("/events")}
          className="mt-4 hover:bg-gray-200 rounded-full"
        >
          Back to Events
        </Button>
      </div>
    );
  }

  const event = selectedEvent;
  const isJoined = event.participants.includes(CURRENT_USER);
  const isFull = event.currentParticipants >= event.maxParticipants;

  // Comments may have been fetched as part of getById (EVENT_DETAIL_FIELDS).
  // If they are present on the event object, pass them to CommentSection so it
  // skips the second network round-trip entirely.
  // The Comment type is present in EventItem only when the detail query ran,
  // so we cast via unknown and check at runtime.
  const embeddedComments = (event as unknown as { comments?: Comment[] }).comments;

  const handleJoinEvent = async () => {
    if (!isJoined && isFull) return;
    try {
      setActionError("");
      await toggleParticipation(event.id, CURRENT_USER);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/events")}
          className="mb-2 px-0 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Button>

        <Card className="overflow-hidden border border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 bg-white px-8 py-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <CardTitle className="text-4xl font-semibold tracking-tight text-gray-900">
                  {event.title}
                </CardTitle>
                <Badge className="w-fit rounded-full bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600">
                  {event.sport}
                </Badge>
              </div>

              <Button
                onClick={() => void handleJoinEvent()}
                disabled={!isJoined && isFull}
                className="rounded-xl bg-pink-500 px-6 py-5 text-base font-semibold text-white hover:bg-pink-600"
              >
                {isJoined ? "Leave Event" : isFull ? "Event Full" : "Join Event"}
              </Button>
            </div>

            {actionError && (
              <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-700">
                {actionError}
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-8 px-8 py-8">
            {/* Info grid */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Date</p>
                    <p className="text-lg font-medium text-gray-900">
                      {new Date(event.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Time & Duration</p>
                    <p className="text-lg font-medium text-gray-900">
                      {event.startTime} ({event.duration})
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Location</p>
                    <p className="text-lg font-medium text-gray-900">
                      {event.location}, {event.city}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Participants</p>
                    <p className="text-lg font-medium text-gray-900">
                      {event.currentParticipants} / {event.maxParticipants}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3 border-t border-gray-100 pt-2">
              <h3 className="text-2xl font-semibold text-gray-900">Description</h3>
              <p className="max-w-3xl text-base leading-7 text-gray-600">{event.description}</p>
            </div>

            {/* Participants */}
            <div className="space-y-4 border-t border-gray-100 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-semibold text-gray-900">Participants</h3>
                {event.participants.length >= 2 && (
                  <Button
                    onClick={() => setShowTeamSplitter(true)}
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                  >
                    <Shuffle className="mr-2 h-4 w-4" />
                    Split Teams
                  </Button>
                )}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <ul className="divide-y divide-gray-200">
                  {event.participants.map((participant, index) => (
                    <li
                      key={`${participant}-${index}`}
                      className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                        {participant.charAt(0)}
                      </div>
                      <span className="text-base font-medium text-gray-800">{participant}</span>
                      {index === 0 && (
                        <Badge
                          variant="outline"
                          className="ml-2 rounded-full border-gray-300 bg-white text-gray-700"
                        >
                          Organizer
                        </Badge>
                      )}
                    </li>
                  ))}
                  {event.currentParticipants < event.maxParticipants && (
                    <li className="pt-4 text-sm font-medium text-gray-500">
                      {event.maxParticipants - event.currentParticipants} spots remaining
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/*
              CommentSection receives initialComments when the event detail
              query already included them (zero extra network round-trip).
              Falls back to its own fetch if initialComments is undefined
              (e.g. offline fallback path returned a plain EventItem).
            */}
            <CommentSection
              eventId={event.id}
              currentUser={CURRENT_USER}
              initialComments={embeddedComments}
            />
          </CardContent>
        </Card>

        {showTeamSplitter && (
          <TeamSplitter
            participants={event.participants}
            sportType={event.sport}
            onClose={() => setShowTeamSplitter(false)}
          />
        )}
      </div>
    </motion.div>
  );
}
