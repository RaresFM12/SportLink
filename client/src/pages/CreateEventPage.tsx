import { useState } from "react";
import { useNavigate } from "react-router";
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
import {
  hasValidationErrors,
  validateEventForm,
  type EventFormErrors,
} from "../validation/eventValidation";
import { usePageTracking } from "../hooks/usePageTracking";
import { motion } from "framer-motion";

export function CreateEventPage() {
  usePageTracking("events-create");

  const navigate = useNavigate();
  const { addEvent } = useEvents();

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

  const [errors, setErrors] = useState<EventFormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    const validationErrors = validateEventForm(form);
    setErrors(validationErrors);

    if (hasValidationErrors(validationErrors)) {
      return;
    }

    try {
      setIsSubmitting(true);

      await addEvent({
        title: form.title.trim(),
        sport: form.sport.trim(),
        city: form.city.trim(),
        date: form.date,
        startTime: form.startTime,
        duration: form.duration.trim(),
        location: form.location.trim(),
        maxParticipants: Number(form.maxParticipants),
        description: form.description.trim(),
        participants: [],
      });

      navigate("/events");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (hasError?: string) =>
    `bg-gray-100 border ${hasError ? "border-red-500" : "border-gray-300"}`;

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
            <CardTitle className="text-3xl font-bold">Create New Event</CardTitle>
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
                  placeholder="Enter event title"
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
                    <SelectValue placeholder="Select a sport" />
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
                  placeholder="Enter city"
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
                    placeholder="e.g. 2 hours"
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
                  placeholder="Enter exact location"
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

              <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {isSubmitting ? "Creating..." : "Create Event"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
