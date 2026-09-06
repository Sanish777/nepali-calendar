import { BS_MONTHS, WEEKDAYS, toDevanagari, fromDevanagari } from "../nepcalendarscrape/bs-data";
import { bsToAd, getTodayDate } from "../nepcalendarscrape/converter";

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
  const maxAttempts = 2;
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
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`NepCalendarScrape could not fetch ${path} (anti-bot/rate-limited).`);
}

interface ParsedCell {
  bsDay: number;
  tithiEn: string;
  festEn: string;
  isRed: boolean;
}

function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s{2,}/g, " ").trim();
}

function parseCells(html: string): ParsedCell[] {
  const cells: ParsedCell[] = [];
  const regex =
    /<div\s+class="cells"[^>]*>\s*<div\s+id="dashi"\s*>\s*(?:<font\s+color='([^']*)'\s*>)?([^<]*?)(?:<\/font>)?\s*&nbsp;\s*<\/div>\s*<div\s+id="nday"\s*>\s*<font\s+color='([^']*)'\s*>\s*([\u0966-\u096F0-9]+)\s*<\/font>\s*<\/div>\s*<div\s+id="eday"\s*><br\s*\/?>\s*<font\s+color='([^']*)'\s*>\s*(\d+)\s*<\/font>\s*<\/div>\s*<div\s+id="fest"\s*>\s*<font\s+color='([^']*)'\s*>\s*([\s\S]*?)\s*<\/font>\s*<\/div>/gi;

  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const dashiFont = (m[1] || "").toLowerCase();
    const tithiEn = (m[2] || "").trim();
    const ndayFont = (m[3] || "").toLowerCase();
    const bsDayRaw = m[4] || "";
    const festFont = (m[7] || "").toLowerCase();
    const festEn = (m[8] || "").trim();

    const bsDay = parseInt(/^\d+$/.test(bsDayRaw) ? bsDayRaw : fromDevanagari(bsDayRaw), 10);
    if (isNaN(bsDay)) continue;

    cells.push({
      bsDay,
      tithiEn: stripTags(tithiEn),
      festEn: stripTags(festEn),
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

export async function scrapeNepCalendarScrapeMonth(
  yearBs: number,
  monthBs: number
): Promise<ScrapedRatMonthResult | null> {
  const slug = RAT_MONTH_SLUGS[monthBs];
  const monthMeta = BS_MONTHS[monthBs - 1];

  const html = await fetchPage(`/${yearBs}/${slug}`);

  const cells = parseCells(html);
  if (cells.length === 0) {
    throw new Error(`NepCalendarScrape page for ${yearBs}/${monthBs} contained no day cells.`);
  }

  // For the current month, harvest Devanagari tithi + festival names from index_nep.php
  let npMerge: MergedNp = { tithiByDay: new Map(), festByDay: new Map() };
  const today = getTodayDate();
  if (yearBs === today.bs.year && monthBs === today.bs.month) {
    try {
      const nepHtml = await fetchPage("/index_nep.php");
      npMerge = parseNepCells(nepHtml);
    } catch {
      npMerge = { tithiByDay: new Map(), festByDay: new Map() };
    }
  }

  const days: ScrapedRatDay[] = cells.map((cell) => {
    const conv = bsToAd(yearBs, monthBs, cell.bsDay);
    const weekday = WEEKDAYS[conv.ad.dayOfWeek];

    const tithiNp =
      npMerge.tithiByDay.get(cell.bsDay) || tithiEnToNp(cell.tithiEn) || (cell.tithiEn ? cell.tithiEn : "");

    const festNpRaw = npMerge.festByDay.get(cell.bsDay) || "";
    const festListEn = cell.festEn
      ? cell.festEn
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const festListNp = festNpRaw
      ? festNpRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const events = festListEn.map((titleEn, i) => ({
      titleNp: festListNp[i] || titleEn,
      titleEn,
      isHoliday: cell.isRed,
    }));

    return {
      yearBs,
      monthBs,
      dayBs: cell.bsDay,
      yearAd: conv.ad.year,
      monthAd: conv.ad.month,
      dayAd: conv.ad.day,
      dayOfWeek: conv.ad.dayOfWeek,
      dayBsNp: toDevanagari(cell.bsDay),
      dayAdNp: toDevanagari(conv.ad.day),
      isToday: today.bs.year === yearBs && today.bs.month === monthBs && today.bs.day === cell.bsDay,
      isWeekendHoliday: weekday.dayIndex === 6,
      isHoliday: cell.isRed,
      tithiShort: tithiNp,
      tithiEn: cell.tithiEn,
      events,
    };
  });

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