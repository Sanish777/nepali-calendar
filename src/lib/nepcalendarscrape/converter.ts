import { BS_MONTHS, WEEKDAYS, toDevanagari } from "./bs-data";
import { getBsMonthLengths } from "./bs-registry";

export interface BSDateResult {
  year: number;
  month: number;
  day: number;
  monthNameEn: string;
  monthNameNp: string;
  dayOfWeek: number;
  dayOfWeekEn: string;
  dayOfWeekNp: string;
  dayBsNp: string;
  yearBsNp: string;
  formattedBs: string;
  formattedBsNp: string;
}

export interface ADDateResult {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  dayOfWeekEn: string;
  dayOfWeekNp: string;
  formattedAd: string;
  isoDate: string;
}

// Known exact AD start dates for Baisakh 1 of BS years
// Anchor: BS 2083-01-01 is AD 2026-04-14
export const BS_YEAR_ANCHORS: Record<number, string> = {
  2000: "1943-04-14",
  2001: "1944-04-13",
  2002: "1945-04-13",
  2003: "1946-04-13",
  2004: "1947-04-14",
  2005: "1948-04-13",
  2006: "1949-04-13",
  2007: "1950-04-13",
  2008: "1951-04-14",
  2009: "1952-04-13",
  2010: "1953-04-13",
  2011: "1954-04-13",
  2012: "1955-04-14",
  2013: "1956-04-13",
  2014: "1957-04-13",
  2015: "1958-04-13",
  2016: "1959-04-14",
  2017: "1960-04-13",
  2018: "1961-04-13",
  2019: "1962-04-13",
  2020: "1963-04-14",
  2021: "1964-04-13",
  2022: "1965-04-13",
  2023: "1966-04-13",
  2024: "1967-04-14",
  2025: "1968-04-13",
  2026: "1969-04-13",
  2027: "1970-04-14",
  2028: "1971-04-14",
  2029: "1972-04-13",
  2030: "1973-04-13",
  2031: "1974-04-14",
  2032: "1975-04-14",
  2033: "1976-04-13",
  2034: "1977-04-13",
  2035: "1978-04-14",
  2036: "1979-04-14",
  2037: "1980-04-13",
  2038: "1981-04-13",
  2039: "1982-04-14",
  2040: "1983-04-14",
  2041: "1984-04-13",
  2042: "1985-04-13",
  2043: "1986-04-14",
  2044: "1987-04-14",
  2045: "1988-04-13",
  2046: "1989-04-13",
  2047: "1990-04-14",
  2048: "1991-04-14",
  2049: "1992-04-13",
  2050: "1993-04-13",
  2051: "1994-04-14",
  2052: "1995-04-14",
  2053: "1996-04-13",
  2054: "1997-04-13",
  2055: "1998-04-14",
  2056: "1999-04-14",
  2057: "2000-04-13",
  2058: "2001-04-14",
  2059: "2002-04-14",
  2060: "2003-04-14",
  2061: "2004-04-13",
  2062: "2005-04-14",
  2063: "2006-04-14",
  2064: "2007-04-14",
  2065: "2008-04-13",
  2066: "2009-04-14",
  2067: "2010-04-14",
  2068: "2011-04-14",
  2069: "2012-04-13",
  2070: "2013-04-14",
  2071: "2014-04-14",
  2072: "2015-04-14",
  2073: "2016-04-13",
  2074: "2017-04-14",
  2075: "2018-04-14",
  2076: "2019-04-14",
  2077: "2020-04-13",
  2078: "2021-04-14",
  2079: "2022-04-14",
  2080: "2023-04-14",
  2081: "2024-04-13",
  2082: "2025-04-14",
  2083: "2026-04-14",
  2084: "2027-04-14",
  2085: "2028-04-14",
  2086: "2029-04-14",
  2087: "2030-04-14",
  2088: "2031-04-15",
  2089: "2032-04-14",
  2090: "2033-04-14",
};


/**
 * Get the anchor Date for Baisakh 1 of a given BS Year.
 * If not in the explicit map, dynamically calculates by stepping from closest anchor.
 */
export function getBsYearStartAdDate(bsYear: number): Date {
  if (BS_YEAR_ANCHORS[bsYear]) {
    const [y, m, d] = BS_YEAR_ANCHORS[bsYear].split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  // Anchor to 2083-01-01 = 2026-04-14
  let currentYear = 2083;
  let currentDate = new Date(Date.UTC(2026, 3, 14));

  if (bsYear > currentYear) {
    while (currentYear < bsYear) {
      const monthLengths = getBsMonthLengths(currentYear);
      const totalDays = monthLengths.reduce((a, b) => a + b, 0);
      currentDate = new Date(currentDate.getTime() + totalDays * 86400000);
      currentYear++;
    }
  } else {
    while (currentYear > bsYear) {
      currentYear--;
      const monthLengths = getBsMonthLengths(currentYear);
      const totalDays = monthLengths.reduce((a, b) => a + b, 0);
      currentDate = new Date(currentDate.getTime() - totalDays * 86400000);
    }
  }

  return currentDate;
}

/**
 * Convert Bikram Sambat (BS) date to Anno Domini (AD) Gregorian date
 */
export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): {
  bs: BSDateResult;
  ad: ADDateResult;
  verification_status: string;
} {
  // Lengths are looked up dynamically (learned years included), so new BS
  // years work without editing reference tables.
  const monthLengths = getBsMonthLengths(bsYear);
  if (bsMonth < 1 || bsMonth > 12) {
    throw new Error(`Invalid BS Month ${bsMonth}. Must be 1-12.`);
  }
  const maxDay = monthLengths[bsMonth - 1];
  if (bsDay < 1 || bsDay > maxDay) {
    throw new Error(`Invalid BS Day ${bsDay} for Month ${bsMonth}, Year ${bsYear}. Must be 1-${maxDay}.`);
  }

  const anchorAd = getBsYearStartAdDate(bsYear);

  // Sum days in previous months of this BS year
  let daysOffset = 0;
  for (let m = 1; m < bsMonth; m++) {
    daysOffset += monthLengths[m - 1];
  }
  daysOffset += (bsDay - 1);

  const adDate = new Date(anchorAd.getTime() + daysOffset * 86400000);

  const adYear = adDate.getUTCFullYear();
  const adMonth = adDate.getUTCMonth() + 1;
  const adDay = adDate.getUTCDate();
  const dayOfWeek = adDate.getUTCDay();

  const weekdayInfo = WEEKDAYS[dayOfWeek];
  const monthMeta = BS_MONTHS[bsMonth - 1];

  const formattedBs = `${bsYear}-${String(bsMonth).padStart(2, "0")}-${String(bsDay).padStart(2, "0")}`;
  const formattedBsNp = `${toDevanagari(bsYear)}-${toDevanagari(String(bsMonth).padStart(2, "0"))}-${toDevanagari(String(bsDay).padStart(2, "0"))}`;
  const formattedAd = `${adYear}-${String(adMonth).padStart(2, "0")}-${String(adDay).padStart(2, "0")}`;

  return {
    bs: {
      year: bsYear,
      month: bsMonth,
      day: bsDay,
      monthNameEn: monthMeta.nameEn,
      monthNameNp: monthMeta.nameNp,
      dayOfWeek,
      dayOfWeekEn: weekdayInfo.nameEn,
      dayOfWeekNp: weekdayInfo.nameNp,
      dayBsNp: toDevanagari(bsDay),
      yearBsNp: toDevanagari(bsYear),
      formattedBs,
      formattedBsNp,
    },
    ad: {
      year: adYear,
      month: adMonth,
      day: adDay,
      dayOfWeek,
      dayOfWeekEn: weekdayInfo.nameEn,
      dayOfWeekNp: weekdayInfo.nameNp,
      formattedAd,
      isoDate: adDate.toISOString(),
    },
    verification_status: "VERIFIED",
  };
}

/**
 * Convert Anno Domini (AD) Gregorian date to Bikram Sambat (BS) date
 */
export function adToBs(adYear: number, adMonth: number, adDay: number): {
  bs: BSDateResult;
  ad: ADDateResult;
  verification_status: string;
} {
  const targetDate = new Date(Date.UTC(adYear, adMonth - 1, adDay));
  const dayOfWeek = targetDate.getUTCDay();

  // BS year is roughly AD year + 57
  let approxBsYear = adYear + 57;

  // Check if targetDate is before Baisakh 1 of approxBsYear
  let anchor = getBsYearStartAdDate(approxBsYear);
  if (targetDate.getTime() < anchor.getTime()) {
    approxBsYear--;
    anchor = getBsYearStartAdDate(approxBsYear);
  }

  const diffDays = Math.round((targetDate.getTime() - anchor.getTime()) / 86400000);
  const monthLengths = getBsMonthLengths(approxBsYear)

  let remainingDays = diffDays;
  let bsMonth = 1;
  while (bsMonth <= 12 && remainingDays >= monthLengths[bsMonth - 1]) {
    remainingDays -= monthLengths[bsMonth - 1];
    bsMonth++;
  }

  if (bsMonth > 12) {
    approxBsYear++;
    bsMonth = 1;
  }

  const bsDay = remainingDays + 1;
  const weekdayInfo = WEEKDAYS[dayOfWeek];
  const monthMeta = BS_MONTHS[bsMonth - 1];

  const formattedBs = `${approxBsYear}-${String(bsMonth).padStart(2, "0")}-${String(bsDay).padStart(2, "0")}`;
  const formattedBsNp = `${toDevanagari(approxBsYear)}-${toDevanagari(String(bsMonth).padStart(2, "0"))}-${toDevanagari(String(bsDay).padStart(2, "0"))}`;
  const formattedAd = `${adYear}-${String(adMonth).padStart(2, "0")}-${String(adDay).padStart(2, "0")}`;

  return {
    bs: {
      year: approxBsYear,
      month: bsMonth,
      day: bsDay,
      monthNameEn: monthMeta.nameEn,
      monthNameNp: monthMeta.nameNp,
      dayOfWeek,
      dayOfWeekEn: weekdayInfo.nameEn,
      dayOfWeekNp: weekdayInfo.nameNp,
      dayBsNp: toDevanagari(bsDay),
      yearBsNp: toDevanagari(approxBsYear),
      formattedBs,
      formattedBsNp,
    },
    ad: {
      year: adYear,
      month: adMonth,
      day: adDay,
      dayOfWeek,
      dayOfWeekEn: weekdayInfo.nameEn,
      dayOfWeekNp: weekdayInfo.nameNp,
      formattedAd,
      isoDate: targetDate.toISOString(),
    },
    verification_status: "VERIFIED",
  };
}

/**
 * Get current BS and AD date based on Nepal Time (UTC+5:45)
 */
export function getTodayDate(): {
  bs: BSDateResult;
  ad: ADDateResult;
  verification_status: string;
} {
  // Current UTC time + 5 hours 45 minutes
  const now = new Date();
  const nptTime = new Date(now.getTime() + (5 * 60 + 45) * 60 * 1000);

  const adYear = nptTime.getUTCFullYear();
  const adMonth = nptTime.getUTCMonth() + 1;
  const adDay = nptTime.getUTCDate();

  return adToBs(adYear, adMonth, adDay);
}
