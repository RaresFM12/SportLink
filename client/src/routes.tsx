import { createBrowserRouter } from 'react-router'
import { LandingPage } from './pages/LandingPage.tsx';
import { MainLayout } from './components/MainLayout.tsx';
import { EventsListPage } from './pages/EventsListPage.tsx';
import { CreateEventPage } from './pages/CreateEventPage.tsx';
import { EditEventPage } from './pages/EditEventPage.tsx';
import { EventDetailsSophisticatedPage } from './pages/EventDetailPage.tsx';
import { StatisticsPage } from './pages/StatisticsPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "register",
    element: <RegisterPage />
  },
  {
    path: "login",
    element: <LoginPage/>
  },
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        path: "events",
        element: <EventsListPage />
      },
      {
        path: "events/new",
        element: <CreateEventPage />
      },
      {
        path: "events/:id/edit",
        element: <EditEventPage />
      },
      {
        path: "events/:id",
        element: <EventDetailsSophisticatedPage />
      },
      {
        path: "statistics",
        element: <StatisticsPage />
      }
    ]
  }
]);