import { BS_MONTHS, WEEKDAYS, toDevanagari, fromDevanagari } from "../nepcalendarscrape/bs-data";
import { bsToAd, getTodayDate } from "../nepcalendarscrape/converter";
import {
  getBsMonthDays,
  getBsMonthLengths,
  getMonthSpelling,
  isBsYearKnown,
  loadLearnedYears,
  rememberMonthSpelling,
  commitBsYear,
} from "../nepcalendarscrape/bs-registry";

export interface ScrapedRatDay {
  yearBs: number;
  monthBs: number;
  dayBs: number;
  yearAd: number;
  monthAd: number;
  dayAd: number;
  dayOfWeek: number;
  dayBsNp: string;
  dayAdNp: string;
  isToday: boolean;
  isWeekendHoliday: boolean;
  isHoliday: boolean;
  tithiShort?: string;
  tithiEn?: string;
  events: {
    titleNp: string;
    titleEn: string;
    isHoliday: boolean;
  }[];
}

export interface ScrapedRatMonthResult {
  source: "NEPCALENDARSCRAPE";
  yearBs: number;
  monthBs: number;
  monthNameNp: string;
  monthNameEn: string;
  daysInMonth: number;
  days: ScrapedRatDay[];
}

const BASE = "https://nepalicalendar.rat32.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// URL slug used on the public month pages (lowercase, year-agnostic).
const RAT_MONTH_SLUGS: Record<number, string> = {
  1: "baisakh",
  2: "jestha",
  3: "ashad",
  4: "shrawan",
  5: "bhadra",
  6: "ashwin",
  7: "kartik",
  8: "mangsir",
  9: "poush",
  10: "magh",
  11: "falgun",
  12: "chaitra",
};

// Seed month= names accepted by index_nep.php. The site matches names
// case-sensitively and differs from the page slug for Mangsir ("Mangshir").
// These are only a starting point: the scraper <learns> and validates the real
// spellings from the site and persists them (see bs-registry), so this table
// never needs a yearly update.
const SEED_NP_MONTHS: Record<number, string> = {
  1: "Baisakh",
  2: "Jestha",
  3: "Ashad",
  4: "Shrawan",
  5: "Bhadra",
  6: "Ashwin",
  7: "Kartik",
  8: "Mangshir",
  9: "Poush",
  10: "Magh",
  11: "Falgun",
  12: "Chaitra",
};

// English transliterations used by nepalicalendar.rat32.com -> Devanagari tithi
const TITHI_NP_MAP: Record<string, string> = {
  pratipada: "प्रतिपदा",
  dwitiya: "द्वितीया",
  dwitaya: "द्वितीया",
  tritiya: "तृतीया",
  tritya: "तृतीया",
  chaturthi: "चतुर्थी",
  panchami: "पञ्चमी",
  sasthi: "षष्ठी",
  shasthi: "षष्ठी",
  saptami: "सप्तमी",
  aastami: "अष्टमी",
  ashtami: "अष्टमी",
  nawami: "नवमी",
  navami: "नवमी",
  dashami: "दशमी",
  ekadashi: "एकादशी",
  dwadashi: "द्वादशी",
  trayodashi: "त्रयोदशी",
  chaturdashi: "चतुर्दशी",
  purnima: "पूर्णिमा",
  amavasya: "औंसी",
  aunsi: "औंसी",
};

function normTithi(input: string): string {
  return input.toLowerCase().replace(/[^a-z]/g, "");
}

function tithiEnToNp(input: string): string {
  const firstWord = input.trim().split(/\s+/)[0] || "";
  const key = normTithi(firstWord);
  return TITHI_NP_MAP[key] || "";
}

async function fetchPage(path: string): Promise<string> {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const resp = await fetch(BASE + path, {
      headers: { "User-Agent": UA },
      redirect: "follow",
      cache: "no-store",
    });
    const html = await resp.text();

    // A blocked page is tiny or shows a JS check ("One moment…")
    const blocked = /<title>One moment/.test(html) || html.length < 5000;
    if (!blocked) return html;

    if (attempt >= maxAttempts - 1) {
      throw new Error(`NepCalendarScrape could not fetch ${path} after ${maxAttempts} attempts (anti-bot/rate-limited).`);
    }
    await new Promise((r) => setTimeout(r, 1200 + attempt * 900));
  }
  throw new Error(`NepCalendarScrape could not fetch ${path} (anti-bot/rate-limited).`);
}

interface ParsedCell {
  bsDay: number;
  eday: number;
  tithiEn: string;
  festEn: string;
  isRed: boolean;
}

function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s{2,}/g, " ").trim();
}

/** Decode HTML numeric + common named entities (old site pages serve Nepali
 *  text as &#NNNN; entities). Left raw when nothing matched. */
function decodeHtmlEntities(input: string): string {
  const NAMED: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return input.replace(
    /&(?:#(\d+)|#x([0-9a-fA-F]+)|([a-zA-Z]+));/g,
    (full, dec: string | undefined, hex: string | undefined, name: string | undefined) => {
      if (dec) {
        try {
          return String.fromCodePoint(parseInt(dec, 10));
        } catch {
          return full;
        }
      }
      if (hex) {
        try {
          return String.fromCodePoint(parseInt(hex, 16));
        } catch {
          return full;
        }
      }
      return name && name in NAMED ? NAMED[name] : full;
    }
  );
}

export function parseCells(html: string): ParsedCell[] {
  const cells: ParsedCell[] = [];
  const regex =
    /<div\s+class="cells"[^>]*>\s*<div\s+id="dashi"\s*>\s*(?:<font\s+color='([^']*)'\s*>)?([^<]*?)(?:<\/font>)?\s*&nbsp;\s*<\/div>\s*<div\s+id="nday"\s*>\s*<font\s+color='([^']*)'\s*>\s*([\u0966-\u096F0-9]+)\s*<\/font>\s*<\/div>\s*<div\s+id="eday"\s*><br\s*\/?>\s*<font\s+color='([^']*)'\s*>\s*(\d+)\s*<\/font>\s*<\/div>\s*<div\s+id="fest"\s*>\s*<font\s+color='([^']*)'\s*>\s*([\s\S]*?)\s*<\/font>\s*<\/div>/gi;

  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const dashiFont = (m[1] || "").toLowerCase();
    const tithiEn = (m[2] || "").trim();
    const ndayFont = (m[3] || "").toLowerCase();
    const bsDayRaw = m[4] || "";
    const edayRaw = m[6] || "";
    const festFont = (m[7] || "").toLowerCase();
    const festEn = (m[8] || "").trim();

    const bsDay = parseInt(/^\d+$/.test(bsDayRaw) ? bsDayRaw : fromDevanagari(bsDayRaw), 10);
    const eday = parseInt(edayRaw, 10);
    if (isNaN(bsDay)) continue;

    cells.push({
      bsDay,
      eday: isNaN(eday) ? 0 : eday,
      tithiEn: decodeHtmlEntities(stripTags(tithiEn)),
      festEn: decodeHtmlEntities(stripTags(festEn)),
      isRed: dashiFont === "red" || ndayFont === "red" || festFont === "red" || /Holiday/i.test(festEn),
    });
  }
  return cells;
}

interface MergedNp {
  tithiByDay: Map<number, string>;
  festByDay: Map<number, string>;
}

function parseNepCells(html: string): MergedNp {
  const tithiByDay = new Map<number, string>();
  const festByDay = new Map<number, string>();
  const cells = parseCells(html);
  for (const cell of cells) {
    if (cell.tithiEn) tithiByDay.set(cell.bsDay, cell.tithiEn);
    if (cell.festEn) festByDay.set(cell.bsDay, cell.festEn);
  }
  return { tithiByDay, festByDay };
}

/**
 * True when a candidate NP page represents the requested BS month.
 * Known years: day-1 AD must match exactly and the rest of the grid must align
 * with the converter (a wrong month — e.g. a bad param returning the current
 * month — aligns on almost no days). Unlearned years: only day-1 within ±1 day
 * is required, since cumulative length drift is possible before the sweep.
 */
function npGridMatches(yearBs: number, monthBs: number, npCells: ParsedCell[]): boolean {
  if (npCells.length < 28) return false;
  const probe = npCells.find((c) => c.eday > 0);
  if (!probe) return false;
  const target = bsToAd(yearBs, monthBs, probe.bsDay).ad.day;

  if (isBsYearKnown(yearBs)) {
    if (probe.eday !== target) return false;
    let total = 0;
    let matched = 0;
    for (const c of npCells) {
      if (c.eday <= 0) continue;
      total++;
      if (c.eday === bsToAd(yearBs, monthBs, c.bsDay).ad.day) matched++;
    }
    return total >= 20 && matched / total >= 0.9;
  }
  return Math.abs(probe.eday - target) <= 1;
}

/**
 * Resolve a validated Nepali month page for (yearBs, monthBs). Tries the
 * learned spelling, the seed spelling, then any spelling discovered on the
 * page, and accepts the first whose grid matches the requested month. Falls
 * back to the current-month root page / transliteration map.
 */
async function resolveNepMonth(
  yearBs: number,
  monthBs: number,
  discovered: string[]
): Promise<{ nepHtml: string; name: string } | null> {
  const candidates: string[] = [];
  const pushUnique = (name: string) => {
    if (name && !candidates.includes(name)) candidates.push(name);
  };
  pushUnique(getMonthSpelling(monthBs));
  pushUnique(SEED_NP_MONTHS[monthBs]);
  for (const name of discovered) pushUnique(name);

  for (const name of candidates) {
    try {
      const nepHtml = await fetchPage(`/index_nep.php?year=${yearBs}&month=${encodeURIComponent(name)}`);
      const npCells = parseCells(nepHtml);
      if (npGridMatches(yearBs, monthBs, npCells)) {
        await rememberMonthSpelling(yearBs, monthBs, name);
        return { nepHtml, name };
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

/** Harvest canonical month= spellings from any index_nep.php link on a page. */
export function discoverMonthParamSpellings(html: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /index_nep\.php\?(?:[^"'&\s]*&)*month=([A-Za-z][A-Za-z ]*?)(?:&|["'\s])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const name = m[1].trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  // Headings like "Nepali Calendar 2083 Baisakh" also reveal canonical names.
  const hRe = /Nepali\s+Calendar\s+\d{4}\s+([A-Za-z]+)/g;
  while ((m = hRe.exec(html)) !== null) {
    const name = m[1].trim();
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

export async function scrapeNepCalendarScrapeMonth(
  yearBs: number,
  monthBs: number
): Promise<ScrapedRatMonthResult | null> {
  // Hydrate learned years/spellings so new years work with zero code changes.
  await loadLearnedYears();

  const slug = RAT_MONTH_SLUGS[monthBs];
  const monthMeta = BS_MONTHS[monthBs - 1];

  const html = await fetchPage(`/${yearBs}/${slug}`);
  const cells = parseCells(html);
  const knownYear = isBsYearKnown(yearBs);

  // Identity check: the page must carry the AD starts matching what our
  // converter says for the requested BS month. Uses the earliest available day
  // cell (some months the site omits the day-1 box). Strict for years in the
  // reference table; lenient for brand-new years where lengths may drift a day.
  const probe = cells.find((c) => c.eday > 0);
  if (!probe) {
    throw new Error(`NepCalendarScrape page for ${yearBs}/${monthBs} had no usable day cell.`);
  }
  const probeExpected = bsToAd(yearBs, monthBs, probe.bsDay).ad.day;
  if (probe.eday !== probeExpected) {
    if (knownYear) {
      throw new Error(
        `NepCalendarScrape page for ${yearBs}/${monthBs} served the wrong month ` +
          `(BS day ${probe.bsDay} AD=${probe.eday}, expected ${probeExpected}).`
      );
    }
    console.warn(
      `[nepcalendarscrape] ${yearBs}/${monthBs} BS day ${probe.bsDay} AD ${probe.eday} vs converter ` +
        `${probeExpected}; proceeding leniently for an unlearned year.`
    );
  }

  const discovered = discoverMonthParamSpellings(html);

  // Union of EN and (validated) NP grids so a day box missing on one page is
  // recovered from the other.
  const byDay = new Map<number, { en?: ParsedCell; np?: ParsedCell }>();
  for (const c of cells) byDay.set(c.bsDay, { en: c });

  let npMerge: MergedNp = { tithiByDay: new Map(), festByDay: new Map() };
  const validated = await resolveNepMonth(yearBs, monthBs, discovered);
  if (validated) {
    const npCells = parseCells(validated.nepHtml);
    for (const c of npCells) {
      const slot = byDay.get(c.bsDay) || {};
      slot.np = c;
      byDay.set(c.bsDay, slot);
      if (c.tithiEn) npMerge.tithiByDay.set(c.bsDay, c.tithiEn);
      if (c.festEn) npMerge.festByDay.set(c.bsDay, c.festEn);
    }
  } else {
    // Param endpoint unavailable or unvalidated: fall back to the current-month
    // root page, still preferred over the transliteration map below.
    try {
      const nepHtml = await fetchPage("/index_nep.php");
      npMerge = parseNepCells(nepHtml);
    } catch {
      npMerge = { tithiByDay: new Map(), festByDay: new Map() };
    }
  }

  const daysInMonth = knownYear ? getBsMonthDays(yearBs, monthBs) : Math.max(...Array.from(byDay.keys()));

  // Brand-new BS year: persist this month's learned length (union of both
  // grids) so bsToAd works for the rest of this process and after restart.
  if (!knownYear) {
    const lengths = [...getBsMonthLengths(yearBs)];
    lengths[monthBs - 1] = daysInMonth;
    await commitBsYear(yearBs, lengths, { persist: true });
  }

  const today = getTodayDate();

  const days: ScrapedRatDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = byDay.get(d)?.en;
    const conv = bsToAd(yearBs, monthBs, d);
    const weekday = WEEKDAYS[conv.ad.dayOfWeek];

    // Deterministic Nepali tithi from the EN tithi when possible; the NP-page
    // value only fills in when the EN cell lacks a tithi. Never emit Latin as
    // a Nepali tithi.
    const tithiNp =
      (cell && tithiEnToNp(cell.tithiEn)) ||
      npMerge.tithiByDay.get(d) ||
      (cell?.tithiEn || "");

    const festNpRaw = npMerge.festByDay.get(d) || "";
    const festListEn = (cell?.festEn || "").split(",").map((s) => s.trim()).filter(Boolean);
    const festListNp = festNpRaw.split(",").map((s) => s.trim()).filter(Boolean);

    // Pair Nepali with English festival names index-wise. If a Nepali title is
    // missing (NP page unreachable/blocked) drop the event rather than persist
    // the Latin title as titleNp — a failed scrape must never corrupt the
    // Nepali language view. Next successful sync restores full events.
    const events = festListEn.flatMap((titleEn, i) => {
      const titleNp = festListNp[i] || tithiEnToNp(titleEn);
      return titleNp ? [{ titleNp, titleEn, isHoliday: Boolean(cell?.isRed) }] : [];
    });

    days.push({
      yearBs,
      monthBs,
      dayBs: d,
      yearAd: conv.ad.year,
      monthAd: conv.ad.month,
      dayAd: conv.ad.day,
      dayOfWeek: conv.ad.dayOfWeek,
      dayBsNp: toDevanagari(d),
      dayAdNp: toDevanagari(conv.ad.day),
      isToday: today.bs.year === yearBs && today.bs.month === monthBs && today.bs.day === d,
      isWeekendHoliday: weekday.dayIndex === 6,
      isHoliday: Boolean(cell?.isRed),
      tithiShort: tithiNp,
      tithiEn: cell?.tithiEn || "",
      events,
    });
  }

  return {
    source: "NEPCALENDARSCRAPE",
    yearBs,
    monthBs,
    monthNameNp: monthMeta.nameNp,
    monthNameEn: monthMeta.nameEn,
    daysInMonth: days.length,
    days,
  };
}