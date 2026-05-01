import { Link } from 'react-router';
import logo from '../assets/logo.png';
import {Button} from '../components/ui/button.tsx';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center">
        <div className="bg-white rounded-3xl shadow-2xl p-12 md:p-16">
          {/* Logo */}
          <div className="flex justify-center">
            <img 
              src={logo} 
              alt="SportLink Logo" 
              className="h-40 w-40 md:h-56 md:w-56 object-contain"
            />
          </div>

          {/* Tagline */}
          <p className="text-2xl md:text-3xl text-blue-600 mb-6">
            Find players. Join matches.
          </p>

          {/* Description */}
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            SportLink is a web platform that helps users organize amateur sports events and find participants for matches. 
            Users can create events for sports like football, tennis, or basketball, browse available events, 
            and join matches organized by others.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button size="lg" className="w-full sm:w-40 bg-blue-600 hover:bg-blue-700 text-white">
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="outline" className="w-full sm:w-40 border-blue-600 text-blue-600 hover:bg-blue-50">
                Register
              </Button>
            </Link>
          </div>
        </div>

        {/* Optional Sports Illustration Background */}
        <div className="mt-8 flex justify-center gap-8 text-gray-400">
          <div className="text-6xl">⚽</div>
          <div className="text-6xl">🏀</div>
          <div className="text-6xl">🎾</div>
          <div className="text-6xl">🏐</div>
        </div>
      </div>
    </div>
  );
}