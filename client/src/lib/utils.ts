import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * SQLite / backend can return timestamp fields in a few different shapes,
 * including the literal string "CURRENT_TIMESTAMP".
 * `new Date("CURRENT_TIMESTAMP")` => Invalid Date, so we normalize.
 */
export function parseDateMaybe(value: unknown): Date | null {
  if (value == null) return null;

  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;

  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;

    // Some inserts may return the literal SQL expression.
    if (raw.toUpperCase() === "CURRENT_TIMESTAMP") return new Date();

    const d = new Date(raw);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  return null;
}

export function formatDateMaybe(
  value: unknown,
  options?: { withTime?: boolean; fallback?: string }
): string {
  const fallback = options?.fallback ?? "—";
  const d = parseDateMaybe(value);
  if (!d) return fallback;

  return options?.withTime ? d.toLocaleString() : d.toLocaleDateString();
}
