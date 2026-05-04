import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { EventsProvider } from './context/EventsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { EventsListPage } from './pages/EventsListPage';
import { EventDetailsSophisticatedPage } from './pages/EventDetailPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { EditEventPage } from './pages/EditEventPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { ChatPage } from './pages/ChatPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <EventsProvider>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginPage />} />

            {/* All authenticated routes use MainLayout */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/events" replace />} />
              <Route path="/events" element={<EventsListPage />} />
              <Route path="/events/new" element={<CreateEventPage />} />
              <Route path="/events/:id" element={<EventDetailsSophisticatedPage />} />
              <Route path="/events/:id/edit" element={<EditEventPage />} />
              <Route path="/my-events" element={<EventsListPage />} />
              <Route path="/statistics" element={<StatisticsPage />} />
              <Route path="/chat" element={<ChatPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/events" replace />} />
          </Routes>
        </EventsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
