import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useEvents } from "../context/EventsContext";
import { useAuth } from "../context/AuthContext";
import {
  hasValidationErrors,
  validateEventForm,
  type EventFormErrors,
} from "../validation/eventValidation";
import { usePageTracking } from "../hooks/usePageTracking";
import { motion } from "framer-motion";

export function EditEventPage() {
  usePageTracking("events-edit");

  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedEvent, selectedEventLoading, fetchEventById, updateEvent } = useEvents();

  const eventId = Number(id);

  const [form, setForm] = useState({
    title: "",
    sport: "",
    city: "",
    date: "",
    startTime: "",
    duration: "",
    location: "",
    maxParticipants: "",
    description: "",
  });

  const [currentParticipants, setCurrentParticipants] = useState(0);
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!Number.isFinite(eventId)) return;

    fetchEventById(eventId).catch((err) => {
      setLoadError(err instanceof Error ? err.message : "Failed to load event");
    });
  }, [eventId, fetchEventById]);

  useEffect(() => {
    if (!selectedEvent || selectedEvent.id !== eventId) return;

    setForm({
      title: selectedEvent.title,
      sport: selectedEvent.sport,
      city: selectedEvent.city,
      date: selectedEvent.date,
      startTime: selectedEvent.startTime,
      duration: selectedEvent.duration,
      location: selectedEvent.location,
      maxParticipants: String(selectedEvent.maxParticipants),
      description: selectedEvent.description,
    });

    setCurrentParticipants(selectedEvent.currentParticipants);
  }, [selectedEvent, eventId]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEvent || selectedEvent.id !== eventId) return;

    setSubmitError("");

    const validationErrors = validateEventForm({
      ...form,
      currentParticipants,
    });

    setErrors(validationErrors);

    if (hasValidationErrors(validationErrors)) {
      return;
    }

    try {
      setSaving(true);

      await updateEvent(selectedEvent.id, {
        title: form.title.trim(),
        sport: form.sport.trim(),
        city: form.city.trim(),
        date: form.date,
        startTime: form.startTime,
        duration: form.duration.trim(),
        location: form.location.trim(),
        maxParticipants: Number(form.maxParticipants),
        description: form.description.trim(),
      });

      navigate("/events");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (hasError?: string) =>
    `bg-gray-100 border ${hasError ? "border-red-500" : "border-gray-300"}`;

  if (selectedEventLoading) {
    return <div className="py-12 text-center text-gray-600">Loading event...</div>;
  }

  if (loadError || !selectedEvent || selectedEvent.id !== eventId) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{loadError || "Event not found"}</p>
        <Button onClick={() => navigate("/events")} className="mt-4">
          Back to Events
        </Button>
      </div>
    );
  }

  const canManageEvent = user?.role === "ADMIN" || selectedEvent.createdByUserId === user?.id;

  if (!canManageEvent) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">You can only edit events created by you.</p>
        <Button onClick={() => navigate("/events")} className="mt-4">
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/events")}
          className="mb-4 hover:bg-gray-200 rounded-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>

        <Card className="shadow-lg border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Edit Event</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {submitError && (
                <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-700">
                  {submitError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className={inputClass(errors.title)}
                />
                {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sport">Sport</Label>
                <Select value={form.sport} onValueChange={(value) => updateField("sport", value)}>
                  <SelectTrigger id="sport" className={inputClass(errors.sport)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Football">Football</SelectItem>
                    <SelectItem value="Basketball">Basketball</SelectItem>
                    <SelectItem value="Tennis">Tennis</SelectItem>
                    <SelectItem value="Volleyball">Volleyball</SelectItem>
                    <SelectItem value="Baseball">Baseball</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.sport && <p className="text-sm text-red-600">{errors.sport}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className={inputClass(errors.city)}
                />
                {errors.city && <p className="text-sm text-red-600">{errors.city}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => updateField("date", e.target.value)}
                    className={inputClass(errors.date)}
                  />
                  {errors.date && <p className="text-sm text-red-600">{errors.date}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => updateField("startTime", e.target.value)}
                    className={inputClass(errors.startTime)}
                  />
                  {errors.startTime && (
                    <p className="text-sm text-red-600">{errors.startTime}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    value={form.duration}
                    onChange={(e) => updateField("duration", e.target.value)}
                    className={inputClass(errors.duration)}
                  />
                  {errors.duration && (
                    <p className="text-sm text-red-600">{errors.duration}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">Max Participants</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    min="2"
                    value={form.maxParticipants}
                    onChange={(e) => updateField("maxParticipants", e.target.value)}
                    className={inputClass(errors.maxParticipants)}
                  />
                  {errors.maxParticipants && (
                    <p className="text-sm text-red-600">{errors.maxParticipants}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  className={inputClass(errors.location)}
                />
                {errors.location && <p className="text-sm text-red-600">{errors.location}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={5}
                  className={inputClass(errors.description)}
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              <Button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
