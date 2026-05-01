import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { Plus, User } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import logo from '../assets/logo.png';

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/");
  };

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
                <Link 
                  to="/events" 
                  className={`${
                    location.pathname === "/events" 
                      ? "text-blue-600" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Events
                </Link>
                {/* <Link 
                  to="/my-events" 
                  className={`${
                    location.pathname === "/my-events" 
                      ? "text-blue-600" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  My Events
                </Link>*/} 
                <Link 
                  to="/statistics" 
                  className={`${
                    location.pathname === "/statistics" 
                      ? "text-blue-600" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Statistics
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
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
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