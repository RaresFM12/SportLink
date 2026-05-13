import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { API_BASE_URL } from "../config/backend";
import logo from "../assets/logo.png";

type ResetResponse = {
  message: string;
  resetToken?: string;
  expiresAt?: string;
};

export function PasswordRecoveryPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/password/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = (await res.json()) as ResetResponse;
      if (!res.ok) throw new Error(data.message ?? "Could not create reset token.");
      if (data.resetToken) setResetToken(data.resetToken);
      setMessage(data.resetToken ? "Reset token generated." : data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create reset token.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: resetToken.trim(), password }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Could not reset password.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="SportLink Logo" className="h-20 w-20 object-contain" />
          </div>
          <CardTitle className="text-3xl">Recover Password</CardTitle>
          <CardDescription>Generate a reset token and choose a new password</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <form onSubmit={(e) => void requestReset(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !username}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
            >
              {loading ? "Generating..." : "Generate reset token"}
            </Button>
          </form>

          <form onSubmit={(e) => void resetPassword(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resetToken">Reset token</Label>
              <Input
                id="resetToken"
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !resetToken || !password || !confirmPassword}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
            >
              {loading ? "Resetting..." : "Reset password"}
            </Button>
          </form>

          <div className="text-center text-sm">
            <Link to="/login" className="text-blue-600 hover:underline">
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
