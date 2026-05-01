import { useEffect, useState } from "react";
import { getCookie } from "../../utils/cookies";
import {
  LAST_VIEWED_EVENT_ID_COOKIE,
  LAST_VISITED_PAGE_COOKIE,
  PREFERRED_SPORT_COOKIE,
  VISIT_COUNT_COOKIE,
} from "../../constants/cookieConstants";

type CookieSummary = {
  visitCount: string;
  lastVisitedPage: string;
  preferredSport: string;
  lastViewedEventId: string;
};

const COOKIE_REFRESH_INTERVAL_MS = 300;

function readCookieSummary(): CookieSummary {
  return {
    visitCount: getCookie(VISIT_COUNT_COOKIE) ?? "0",
    lastVisitedPage: getCookie(LAST_VISITED_PAGE_COOKIE) ?? "N/A",
    preferredSport: getCookie(PREFERRED_SPORT_COOKIE) ?? "N/A",
    lastViewedEventId: getCookie(LAST_VIEWED_EVENT_ID_COOKIE) ?? "N/A",
  };
}

export function UserActivitySummary() {
  const [cookieSummary, setCookieSummary] = useState<CookieSummary>(
    readCookieSummary
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCookieSummary(readCookieSummary());
    }, COOKIE_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-gray-50 shadow-sm">
      <h2 className="text-lg font-bold mb-2">User Activity (Cookies)</h2>

      <div className="space-y-1 text-sm">
        <p>
          <strong>Visit count:</strong> {cookieSummary.visitCount}
        </p>
        <p>
          <strong>Last visited page:</strong> {cookieSummary.lastVisitedPage}
        </p>
        <p>
          <strong>Preferred sport:</strong> {cookieSummary.preferredSport}
        </p>
        <p>
          <strong>Last viewed event ID:</strong> {cookieSummary.lastViewedEventId}
        </p>
      </div>
    </div>
  );
}