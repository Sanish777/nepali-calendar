export interface ScrapedPanchanga {
  nakshatra?: string;
  nakshatraIndex?: number;
  tithi?: string;
  tithiIndex?: number;
  paksha?: string;
  yoga?: string;
  yogaIndex?: number;
  karana?: string;
  karanaIndex?: number;
  rashi?: string;
  sunrise?: string;
  sunset?: string;
  moonrise?: string;
  moonset?: string;
}

export interface ScrapedEventItem {
  titleNp: string;
  titleEn: string;
  isHoliday: boolean;
  imageUrl?: string;
  articleUrlNp?: string;
  articleUrlEn?: string;
}

export interface ScrapedDay {
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
  panchanga?: ScrapedPanchanga;
  events: ScrapedEventItem[];
}

export interface ScrapedMonthResult {
  source: "HAMROPATRO";
  yearBs: number;
  monthBs: number;
  monthNameNp: string;
  monthNameEn: string;
  daysInMonth: number;
  days: ScrapedDay[];
}

function formatSecondsToTime(sec: number): string {
  if (!sec || isNaN(sec)) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function scrapeHamroPatroMonth(
  yearBs: number,
  monthBs: number
): Promise<ScrapedMonthResult | null> {
  const url = `https://www.hamropatro.com/calendar/${yearBs}/${monthBs}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HamroPatro HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();

  // Search inside script tags for initialMonths push
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
  let match;
  let monthsData: any[] | null = null;

  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1];
    if (content.includes("initialMonths") && content.includes("self.__next_f.push")) {
      const argMatch = /self\.__next_f\.push\(([\s\S]*?)\);?$/.exec(content.trim());
      if (argMatch) {
        try {
          const parsed = JSON.parse(argMatch[1]);
          const payload = parsed[1];
          const idx = payload.indexOf('initialMonths":');
          if (idx !== -1) {
            const start = payload.indexOf("[", idx);
            let depth = 0;
            let end = start;
            for (let i = start; i < payload.length; i++) {
              if (payload[i] === "[") depth++;
              else if (payload[i] === "]") {
                depth--;
                if (depth === 0) {
                  end = i + 1;
                  break;
                }
              }
            }
            monthsData = JSON.parse(payload.substring(start, end));
            break;
          }
        } catch {
          // continue checking next script if any parse error occurs
        }
      }
    }
  }

  if (!monthsData || monthsData.length === 0) {
    return null;
  }

  // Pick the requested month from returned months
  const targetMonth = monthsData.find((m: any) => m.monthBs === monthBs) || monthsData[0];
  const inMonthDays = (targetMonth.days || []).filter((d: any) => d.inMonth !== false);

  const days: ScrapedDay[] = inMonthDays.map((d: any) => {
    const rawPan = d.panchanga || {};
    const rawEvents = d.patroEvent?.items || [];

    const events: ScrapedEventItem[] = rawEvents.map((item: any) => ({
      titleNp: item.titleNp || "",
      titleEn: item.titleEn || "",
      isHoliday: Boolean(item.isHoliday),
      imageUrl: d.patroEvent?.image,
      articleUrlNp: d.patroEvent?.articleUrlNp,
      articleUrlEn: d.patroEvent?.articleUrlEn,
    }));

    // If day has single title but no items array
    if (events.length === 0 && d.patroEvent?.titleNp) {
      events.push({
        titleNp: d.patroEvent.titleNp,
        titleEn: d.patroEvent.titleEn || d.patroEvent.titleNp,
        isHoliday: Boolean(d.patroEvent.isHoliday),
        imageUrl: d.patroEvent.image,
        articleUrlNp: d.patroEvent.articleUrlNp,
        articleUrlEn: d.patroEvent.articleUrlEn,
      });
    }

    const panchanga: ScrapedPanchanga = {
      nakshatraIndex: rawPan.nakshtra,
      tithiIndex: rawPan.tithi,
      paksha: rawPan.paksha === 0 ? "Shukla" : "Krishna",
      yogaIndex: rawPan.yoga,
      karanaIndex: rawPan.karana,
      sunrise: formatSecondsToTime(rawPan.sunrise),
      sunset: formatSecondsToTime(rawPan.sunset),
      moonrise: formatSecondsToTime(rawPan.moonrise),
      moonset: formatSecondsToTime(rawPan.moonset),
    };

    return {
      yearBs: d.year_bs,
      monthBs: d.month_bs,
      dayBs: d.day_bs,
      yearAd: d.year_ad,
      monthAd: d.month_ad,
      dayAd: d.day_ad,
      dayOfWeek: d.dayOfWeek,
      dayBsNp: d.dayBsNp,
      dayAdNp: d.dayAdNp,
      isToday: Boolean(d.isToday),
      isWeekendHoliday: Boolean(d.isWeekendHoliday),
      isHoliday: Boolean(d.isHoliday),
      tithiShort: d.tithiShort,
      panchanga,
      events,
    };
  });

  return {
    source: "HAMROPATRO",
    yearBs: targetMonth.yearBs,
    monthBs: targetMonth.monthBs,
    monthNameNp: targetMonth.monthNameNp,
    monthNameEn: targetMonth.monthNameEn,
    daysInMonth: targetMonth.daysInMonth || days.length,
    days,
  };
}
