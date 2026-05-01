import { useEffect } from "react";
import { trackLastVisitedPage } from "../utils/activityTracking";

export function usePageTracking(pageName: string) {
  useEffect(() => {
    trackLastVisitedPage(pageName);
  }, [pageName]);
}