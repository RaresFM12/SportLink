import { useEffect } from "react";
import { trackVisitCount } from "../utils/activityTracking";

export function useVisitTracking() {
  useEffect(() => {
    trackVisitCount();
  }, []);
}