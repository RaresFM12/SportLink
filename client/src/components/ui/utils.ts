import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function filterProps<T extends Record<string, any>>(props: T): Partial<T> {
  const filtered: any = {};
  for (const key in props) {
    if (!key.startsWith('_fg')) {
      filtered[key] = props[key];
    }
  }
  return filtered;
}