import { getCookie, setCookie } from "./cookies";
import {
  LAST_VIEWED_EVENT_ID_COOKIE,
  LAST_VISITED_PAGE_COOKIE,
  PREFERRED_SPORT_COOKIE,
  VISIT_COUNT_COOKIE,
} from "../constants/cookieConstants";

const DEFAULT_VISIT_COUNT = 0;

export function trackVisitCount() {
  const currentCount = Number(getCookie(VISIT_COUNT_COOKIE) ?? DEFAULT_VISIT_COUNT);
  setCookie(VISIT_COUNT_COOKIE, String(currentCount + 1));
}

export function trackLastVisitedPage(pageName: string) {
  setCookie(LAST_VISITED_PAGE_COOKIE, pageName);
}

export function savePreferredSport(sport: string) {
  setCookie(PREFERRED_SPORT_COOKIE, sport);
}

export function getPreferredSport(): string {
  return getCookie(PREFERRED_SPORT_COOKIE) ?? "";
}

export function trackLastViewedEventId(eventId: number) {
  setCookie(LAST_VIEWED_EVENT_ID_COOKIE, String(eventId));
}