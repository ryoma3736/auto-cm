/**
 * Lightweight client-side record of recently generated CMs, persisted to localStorage.
 * Honest "recent works" data for the dashboard — no hardcoded fiction.
 *
 * We intentionally store only metadata (name, engines, status, aspect), NOT the product
 * image data URL, to stay well under the ~5MB localStorage budget. Thumbnails are rendered
 * from a brand-colored tile at the call site.
 *
 * Server-driven history (KV sorted set `autocm:jobs:recent` + `GET /api/jobs`) is a future
 * enhancement; this client store keeps the dashboard truthful today.
 */

export type RecentStatus = "processing" | "succeeded" | "failed";

export interface RecentItem {
  id: string;
  name: string;
  createdAt: number;
  aspect: string;
  engines: string[];
  status: RecentStatus;
}

const KEY = "autocm:recent";
const CAP = 12;
/** Dispatched after any mutation so mounted views can refresh without a storage event. */
export const RECENT_EVENT = "autocm:recent-changed";

function read(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as RecentItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: RecentItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, CAP)));
    window.dispatchEvent(new Event(RECENT_EVENT));
  } catch {
    /* quota or serialization issue — non-fatal for a convenience feature */
  }
}

export function loadRecent(): RecentItem[] {
  return read().sort((a, b) => b.createdAt - a.createdAt);
}

export function pushRecent(item: RecentItem): void {
  const next = [item, ...read().filter((r) => r.id !== item.id)];
  write(next);
}

export function updateRecentStatus(id: string, status: RecentStatus): void {
  const items = read();
  const idx = items.findIndex((r) => r.id === id);
  if (idx === -1) return;
  items[idx] = { ...items[idx], status };
  write(items);
}
