import type { EventItem } from "../types/event";
import { eventService } from "./eventService";
import { offlineEvents } from "./offlineEvents";

export async function isServerReachable(): Promise<boolean> {
  if (!navigator.onLine) {
    return false;
  }

  try {
    await eventService.getAll({ page: 1, limit: 1 });
    return true;
  } catch {
    return false;
  }
}

export async function syncPendingOperations(): Promise<EventItem[]> {
  const pendingOperations = offlineEvents.getPendingOperations();

  if (pendingOperations.length === 0) {
    const response = await eventService.getAll({ page: 1, limit: 1000 });
    offlineEvents.replaceAll(response.items);
    return response.items;
  }

  for (const operation of pendingOperations) {
    switch (operation.type) {
      case "add":
        await eventService.add(operation.payload);
        break;

      case "update":
        await eventService.update(operation.id, operation.payload);
        break;

      case "remove":
        await eventService.remove(operation.id);
        break;

      case "join":
        await eventService.join(operation.id, operation.userName);
        break;

      case "leave":
        await eventService.leave(operation.id, operation.userName);
        break;
    }
  }

  offlineEvents.clearPendingOperations();

  const refreshedResponse = await eventService.getAll({ page: 1, limit: 1000 });
  offlineEvents.replaceAll(refreshedResponse.items);
  return refreshedResponse.items;
}