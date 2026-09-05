import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiUsage, withRateLimitHeaders } from "@/lib/auth/api-key";
import { bsToAd, adToBs, getTodayDate } from "@/lib/nepali-calendar/converter";
import { calculatePanchanga } from "@/lib/nepali-calendar/panchanga";
import { prisma } from "@/lib/prisma";
import { getActiveCalendarSource } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { auth, errorResponse } = await authenticateApiKey(req);
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const bsYearParam = url.searchParams.get("bs_year") || url.searchParams.get("year");
  const bsMonthParam = url.searchParams.get("bs_month") || url.searchParams.get("month");
  const bsDayParam = url.searchParams.get("bs_day") || url.searchParams.get("day");
  const adDateParam = url.searchParams.get("ad_date") || url.searchParams.get("date");

  let bsYear: number;
  let bsMonth: number;
  let bsDay: number;
  let adDate: Date;

  try {
    if (bsYearParam && bsMonthParam && bsDayParam) {
      bsYear = parseInt(bsYearParam, 10);
      bsMonth = parseInt(bsMonthParam, 10);
      bsDay = parseInt(bsDayParam, 10);
      const conv = bsToAd(bsYear, bsMonth, bsDay);
      adDate = new Date(conv.ad.isoDate);
    } else if (adDateParam) {
      const parts = adDateParam.split("-").map(Number);
      const conv = adToBs(parts[0], parts[1], parts[2]);
      bsYear = conv.bs.year;
      bsMonth = conv.bs.month;
      bsDay = conv.bs.day;
      adDate = new Date(conv.ad.isoDate);
    } else {
      const today = getTodayDate();
      bsYear = today.bs.year;
      bsMonth = today.bs.month;
      bsDay = today.bs.day;
      adDate = new Date(today.ad.isoDate);
    }
  } catch (err: any) {
    return withRateLimitHeaders(
      NextResponse.json(
        { success: false, error: "InvalidDate", message: err.message },
        { status: 400 }
      ),
      auth?.rateLimit
    );
  }

  // Check DB date for scraped astronomical values (active source first, else any)
  const source = await getActiveCalendarSource();
  const dbDate =
    (await prisma.calendarDate.findFirst({
      where: { source, bsYear, bsMonth, bsDay },
    })) ||
    (await prisma.calendarDate.findFirst({
      where: { bsYear, bsMonth, bsDay },
      orderBy: { source: "asc" },
    }));

  const pan = calculatePanchanga(adDate);

  const duration = Date.now() - startTime;
  if (auth) {
    logApiUsage(
      auth.apiKey.id,
      "/api/v1/panchanga",
      "GET",
      200,
      duration,
      req.headers.get("x-forwarded-for") || undefined,
      req.headers.get("user-agent") || undefined
    );
  }

  return withRateLimitHeaders(
    NextResponse.json({
      success: true,
      data: {
        date: {
          bs_year: bsYear,
          bs_month: bsMonth,
          bs_day: bsDay,
          ad_date: adDate.toISOString().slice(0, 10),
        },
        tithi: {
          index: dbDate?.tithiShort ? undefined : pan.tithi.index,
          name_np: dbDate?.tithiNameNp || pan.tithi.nameNp,
          name_en: dbDate?.tithiNameEn || pan.tithi.nameEn,
          short_np: dbDate?.tithiShort || pan.tithi.nameNp.split(" ")[0],
          paksha: dbDate?.paksha || pan.tithi.paksha,
        },
        nakshatra: {
          name_np: dbDate?.nakshatra || pan.nakshatra.nameNp,
          index: dbDate?.nakshatraIndex || pan.nakshatra.index,
        },
        yoga: {
          index: dbDate?.yogaIndex || pan.yoga.index,
          name_np: pan.yoga.nameNp,
        },
        karana: {
          index: dbDate?.karanaIndex || pan.karana.index,
          name_np: pan.karana.nameNp,
        },
        rashi: pan.rashi,
        astronomy: {
          sunrise: dbDate?.sunrise || pan.astronomy.sunrise,
          sunset: dbDate?.sunset || pan.astronomy.sunset,
          moonrise: dbDate?.moonrise || pan.astronomy.moonrise,
          moonset: dbDate?.moonset || pan.astronomy.moonset,
          location: pan.astronomy.coordinates,
        },
      },
    }),
    auth?.rateLimit
  );
}
