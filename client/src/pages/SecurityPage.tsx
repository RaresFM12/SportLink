import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  securityService,
  type ActionLog,
  type ObservationUser,
} from "../services/securityService";

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export function SecurityPage() {
  const [observations, setObservations] = useState<ObservationUser[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refreshSecurityData() {
    const [observationRows, logRows] = await Promise.all([
      securityService.listObservationUsers(),
      securityService.listRecentLogs(50),
    ]);
    setObservations(observationRows);
    setLogs(logRows);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSecurityData() {
      try {
        setLoading(true);
        setError("");
        await refreshSecurityData();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load security data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSecurityData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshSecurityData().catch(() => undefined);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-gray-600">Loading security data...</div>;
  }

  if (error) {
    return <div className="py-12 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-7 w-7 text-purple-700" />
        <h1 className="text-3xl font-bold text-gray-900">Security Monitoring</h1>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>Observation List</CardTitle>
        </CardHeader>
        <CardContent>
          {observations.length === 0 ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
              No suspicious users are currently under observation.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Last Action</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {observations.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.user.displayName}
                      <div className="text-xs text-gray-500">@{item.user.username}</div>
                    </TableCell>
                    <TableCell>{item.groupId}</TableCell>
                    <TableCell>{item.suspicionScore}</TableCell>
                    <TableCell>{item.reason}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{item.lastActionInfo}</TableCell>
                    <TableCell>{formatDate(item.lastActionAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>Recent Action Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {log.user.displayName}
                    <div className="text-xs text-gray-500">@{log.user.username}</div>
                  </TableCell>
                  <TableCell>{log.groupId}</TableCell>
                  <TableCell className="max-w-[360px] truncate">{log.actionInformation}</TableCell>
                  <TableCell>{log.statusCode}</TableCell>
                  <TableCell>{formatDate(log.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
