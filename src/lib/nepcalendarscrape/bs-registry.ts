import { prisma } from "../prisma";
import { BS_CALENDAR_DATA } from "./bs-data";

/**
 * Runtime BS calendar registry.
 *
 * The hardcoded reference tables in bs-data.ts end at 2090. This registry lets
 * the scraper *learn* new BS years (month lengths, canonical month= spellings)
 * from upstream calendar sites and persist them, so a new year "just works"
 * without a code release. Reads are synchronous so the pure converter keeps its
 * synchronous API; persistence is async and cached.
 */

const DEFAULT_MONTH_LENGTHS = [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30];

const SEED_MONTH_NAMES = [
  "Baisakh", "Jestha", "Ashad", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangshir", "Poush", "Magh", "Falgun", "Chaitra",
];

// Synchronously consultable, learned-at-runtime caches.
const runtimeYears = new Map<number, number[]>();
const monthSpellingsByIndex = new Map<number, string>();

let dbLoaded = false;
let loadingPromise: Promise<void> | null = null;

function normalizeMonthName(input: string): string {
  return input.toLowerCase().replace(/[^a-z]/g, "");
}

/** Synchronous month-length lookup: runtime (learned) -> hardcoded -> default. */
export function getBsMonthLengths(bsYear: number): number[] {
  const learned = runtimeYears.get(bsYear);
  if (learned && learned.length === 12) return learned;
  const hardcoded = BS_CALENDAR_DATA[bsYear];
  return hardcoded || DEFAULT_MONTH_LENGTHS;
}

/** Number of days in a specific BS month (sync). */
export function getBsMonthDays(bsYear: number, bsMonth: number): number {
  return getBsMonthLengths(bsYear)[bsMonth - 1] ?? 30;
}

/** Whether the given BS year is fully known (all 12 month lengths). */
export function isBsYearKnown(bsYear: number): boolean {
  return Boolean(runtimeYears.get(bsYear) || BS_CALENDAR_DATA[bsYear]);
}

/** Canonical month= spelling for a BS month index (1-12), learned or seeded. */
export function getMonthSpelling(bsMonth: number): string {
  return monthSpellingsByIndex.get(bsMonth) || SEED_MONTH_NAMES[bsMonth - 1] || "";
}

/**
 * Register a fully-known BS year (all 12 month lengths) so converters and
 * future scrapes use it immediately and across restarts. Idempotent.
 */
export async function commitBsYear(
  bsYear: number,
  monthLengths: number[],
  opts?: { source?: string; persist?: boolean }
): Promise<void> {
  if (!monthLengths || monthLengths.length !== 12) return;
  runtimeYears.set(bsYear, [...monthLengths]);
  if (opts?.persist === false) return;
  try {
    await prisma.scraperCalendarMeta.upsert({
      where: { bsYear },
      create: {
        bsYear,
        monthLengths,
        monthNames: Array.from({ length: 12 }, (_, i) => getMonthSpelling(i + 1)),
        source: opts?.source || "NEPCALENDARSCRAPE",
        verifiedFrom: "nepalicalendar.rat32.com",
      },
      update: { monthLengths, lastVerifiedAt: new Date() },
    });
  } catch (e) {
    // Persistence is best-effort; the in-memory value still applies this run.
    console.error(`[bs-registry] failed to persist BS year ${bsYear}:`, (e as Error).message);
  }
}

/** Record a successfully validated canonical spelling for a BS month. */
export async function rememberMonthSpelling(
  bsYear: number,
  bsMonth: number,
  canonical: string
): Promise<void> {
  if (!canonical || bsYear <= 0) return;
  monthSpellingsByIndex.set(bsMonth, canonical);
  const monthNames = Array.from({ length: 12 }, (_, i) => getMonthSpelling(i + 1));
  try {
    await prisma.scraperCalendarMeta.upsert({
      where: { bsYear },
      create: {
        bsYear,
        monthLengths: getBsMonthLengths(bsYear),
        monthNames,
        source: "NEPCALENDARSCRAPE",
        verifiedFrom: "nepalicalendar.rat32.com",
      },
      update: { monthNames, lastVerifiedAt: new Date() },
    });
  } catch (e) {
    console.error("[bs-registry] failed to persist month spellings:", (e as Error).message);
  }
}

async function hydrate(): Promise<void> {
  try {
    const rows = await prisma.scraperCalendarMeta.findMany({
      select: { bsYear: true, monthNames: true, monthLengths: true },
    });
    for (const r of rows) {
      if (r.monthLengths?.length === 12) runtimeYears.set(r.bsYear, r.monthLengths);
      if (r.monthNames?.length === 12) {
        for (let i = 0; i < 12; i++) {
          if (r.monthNames[i]) monthSpellingsByIndex.set(i + 1, r.monthNames[i]);
        }
      }
    }
  } catch (e) {
    console.error("[bs-registry] failed to hydrate learned data:", (e as Error).message);
  }
}

/** Hydrate runtime caches from the database. Safe to call repeatedly. */
export function loadLearnedYears(): Promise<void> {
  if (dbLoaded) return Promise.resolve();
  if (loadingPromise) return loadingPromise!;
  loadingPromise = hydrate().then(() => {
    dbLoaded = true;
    loadingPromise = null;
  });
  return loadingPromise!;
}

/** Resolve an arbitrary upstream month= spelling to a BS month index (1-12). */
export function spellToMonthIndex(spelling: string): number | undefined {
  const key = normalizeMonthName(spelling);
  for (const [i, name] of monthSpellingsByIndex.entries()) {
    if (normalizeMonthName(name) === key) return i;
  }
  for (let i = 0; i < 12; i++) {
    if (normalizeMonthName(SEED_MONTH_NAMES[i]) === key) return i + 1;
  }
  return undefined;
}