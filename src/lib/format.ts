export type SetlistEntry = {
  song: string;
  set_label?: string | null;
  is_encore?: boolean;
  note?: string | null;
};

/** Prisma Decimal | number | string -> number | null */
export function toNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v.toString());
  return Number.isFinite(n) ? n : null;
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function yearOf(d: Date | string): number {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.getUTCFullYear();
}

export function isUpcoming(d: Date | string): boolean {
  const date = typeof d === "string" ? new Date(d) : d;
  // Compare on date only; a show earlier today still counts as past.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return date.getTime() >= today.getTime();
}

/** "in 3 weeks" / "next month" style relative label for upcoming dates. */
export function untilLabel(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 14) return `in ${days} days`;
  if (days < 60) return `in ${Math.round(days / 7)} weeks`;
  return `in ${Math.round(days / 30)} months`;
}

/** Compact "time since" label for activity feeds. */
export function timeAgo(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const secs = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return formatDate(date);
}

/** Coarse bucket for grouping a feed by recency. */
export function recencyBucket(d: Date | string): "Today" | "This week" | "This month" | "Earlier" {
  const date = typeof d === "string" ? new Date(d) : d;
  const days = (Date.now() - date.getTime()) / 86400000;
  if (days < 1) return "Today";
  if (days < 7) return "This week";
  if (days < 31) return "This month";
  return "Earlier";
}

export function parseSetlist(raw: unknown): SetlistEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is SetlistEntry => !!e && typeof (e as SetlistEntry).song === "string"
  );
}
