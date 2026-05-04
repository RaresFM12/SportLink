import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { Plus, User, MessageSquare, LogOut, Shield } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import logo from '../assets/logo.png';
import { useAuth } from "../context/AuthContext";

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`${
        location.pathname === to
          ? "text-blue-600 font-medium"
          : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link to="/events" className="flex items-center gap-3">
                <img
                  src={logo}
                  alt="SportLink Logo"
                  className="h-10 w-10 object-contain"
                />
                <span className="text-xl text-gray-900">SportLink</span>
              </Link>

              {/* Navigation Links */}
              <div className="hidden md:flex items-center gap-6">
                {navLink("/events", "Events")}
                {navLink("/my-events", "My Events")}
                {navLink("/statistics", "Statistics")}

                {/* Chat link */}
                <Link
                  to="/chat"
                  className={`flex items-center gap-1.5 ${
                    location.pathname === "/chat"
                      ? "text-blue-600 font-medium"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </Link>

                <Link
                  to="/events/new"
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Event</span>
                </Link>
              </div>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-3">
              {/* Show current user info */}
              {user && (
                <div className="hidden sm:flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-medium text-gray-800">
                      {user.displayName}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 w-fit ${
                        user.role === 'ADMIN'
                          ? 'border-purple-300 text-purple-700'
                          : 'border-gray-300 text-gray-500'
                      }`}
                    >
                      {user.role === 'ADMIN' && (
                        <Shield className="h-2.5 w-2.5 mr-0.5 inline" />
                      )}
                      {user.role}
                    </Badge>
                  </div>
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {user && (
                    <DropdownMenuItem disabled className="text-xs text-gray-500">
                      Signed in as {user.username}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate('/chat')}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => void handleLogout()}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
