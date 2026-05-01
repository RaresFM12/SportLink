import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useEvents } from "../context/EventsContext";
import { usePageTracking } from "../hooks/usePageTracking";
import { motion } from "framer-motion";

export function StatisticsPage() {
  usePageTracking("events-statistics");

  const {
    statistics,
    statisticsLoading,
    error,
    fetchStatistics,
    generatorRunning,
    startGenerator,
    stopGenerator,
  } = useEvents();

  const [generatorActionLoading, setGeneratorActionLoading] = useState(false);

  useEffect(() => {
    fetchStatistics().catch(() => undefined);
  }, [fetchStatistics]);

  const handleStartGenerator = async () => {
    try {
      setGeneratorActionLoading(true);
      await startGenerator(3, 4000);
    } finally {
      setGeneratorActionLoading(false);
    }
  };

  const handleStopGenerator = async () => {
    try {
      setGeneratorActionLoading(true);
      await stopGenerator();
    } finally {
      setGeneratorActionLoading(false);
    }
  };

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  if (statisticsLoading) {
    return <div className="py-12 text-center text-gray-600">Loading statistics...</div>;
  }

  if (error && !statistics) {
    return <div className="py-12 text-center text-red-600">{error}</div>;
  }

  if (!statistics) {
    return <div className="py-12 text-center text-gray-600">No statistics available.</div>;
  }

  const hasNoData =
    statistics.sports.length === 0 &&
    statistics.locations.length === 0 &&
    statistics.dates.length === 0;

  const commentStats = statistics.comments;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Event Statistics</h1>

          <div className="flex items-center gap-3">
            <div
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                generatorRunning
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              Generator: {generatorRunning ? "Running" : "Stopped"}
            </div>

            <Button
              onClick={() => void handleStartGenerator()}
              disabled={generatorActionLoading || generatorRunning}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Start Generator
            </Button>

            <Button
              onClick={() => void handleStopGenerator()}
              disabled={generatorActionLoading || !generatorRunning}
              variant="outline"
            >
              Stop Generator
            </Button>
          </div>
        </div>

        {hasNoData ? (
          <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-500">
            No statistics data available.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Events by Sport</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statistics.sports}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sport" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Events" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Events by Location</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statistics.locations}
                        dataKey="count"
                        nameKey="location"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        label
                      >
                        {statistics.locations.map((entry, index) => (
                          <Cell key={entry.location} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle>Events by Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statistics.dates.map((item) => (
                      <TableRow key={item.date}>
                        <TableCell>{item.date}</TableCell>
                        <TableCell>{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── Comment Statistics ───────────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Comment Statistics</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-gray-500">Total Comments</p>
                <p className="mt-1 text-4xl font-bold text-blue-600">
                  {commentStats?.totalComments ?? 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-gray-500">Events With Comments</p>
                <p className="mt-1 text-4xl font-bold text-blue-600">
                  {commentStats?.commentsPerEvent.length ?? 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-gray-500">Avg Comments / Event</p>
                <p className="mt-1 text-4xl font-bold text-blue-600">
                  {commentStats && commentStats.commentsPerEvent.length > 0
                    ? (
                        commentStats.totalComments / commentStats.commentsPerEvent.length
                      ).toFixed(1)
                    : "0"}
                </p>
              </CardContent>
            </Card>
          </div>

          {commentStats && commentStats.mostCommentedEvents.length > 0 && (
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle>Most Commented Events</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Comments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commentStats.mostCommentedEvents.map((item) => (
                      <TableRow key={item.eventId}>
                        <TableCell className="font-medium">{item.eventTitle}</TableCell>
                        <TableCell>{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {commentStats && commentStats.commentsPerEvent.length > 0 && (
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle>Comments per Event</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={commentStats.commentsPerEvent.slice(0, 15)}
                    margin={{ bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="eventTitle"
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Comments" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
