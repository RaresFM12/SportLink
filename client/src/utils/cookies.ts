import { COOKIE_EXPIRATION_DAYS } from "../constants/cookieConstants";

export function setCookie(
  name: string,
  value: string,
  days = COOKIE_EXPIRATION_DAYS
) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

  document.cookie = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `expires=${expires.toUTCString()}`,
    "path=/",
    "SameSite=Lax",
  ].join("; ");
}

export function getCookie(name: string): string | null {
  const encodedName = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie.split("; ");

  for (const cookie of cookies) {
    if (cookie.startsWith(encodedName)) {
      return decodeURIComponent(cookie.substring(encodedName.length));
    }
  }

  return null;
}