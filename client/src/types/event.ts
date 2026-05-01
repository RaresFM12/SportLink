export type EventItem = {
  id: number;
  title: string;
  sport: string;
  city: string;
  location: string;
  date: string;
  startTime: string;
  duration: string;
  maxParticipants: number;
  currentParticipants: number;
  description: string;
  participants: string[];
};

export type Comment = {
  id: number;
  eventId: number;
  author: string;
  content: string;
  createdAt: string;
};
