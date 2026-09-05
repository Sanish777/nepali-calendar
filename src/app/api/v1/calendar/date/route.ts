import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiUsage, withRateLimitHeaders } from "@/lib/auth/api-key";
import { bsToAd, adToBs } from "@/lib/nepali-calendar/converter";
import { prisma } from "@/lib/prisma";
import { calculatePanchanga } from "@/lib/nepali-calendar/panchanga";
import { getActiveCalendarSource } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { auth, errorResponse } = await authenticateApiKey(req);
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  let bsYear = parseInt(url.searchParams.get("bs_year") || "", 10);
  let bsMonth = parseInt(url.searchParams.get("bs_month") || "", 10);
  let bsDay = parseInt(url.searchParams.get("bs_day") || "", 10);

  const adDateParam = url.searchParams.get("ad_date") || url.searchParams.get("date");
  let convData: ReturnType<typeof bsToAd>;

  try {
    if (adDateParam) {
      const parts = adDateParam.split("-").map(Number);
      convData = adToBs(parts[0], parts[1], parts[2]);
      bsYear = convData.bs.year;
      bsMonth = convData.bs.month;
      bsDay = convData.bs.day;
    } else {
      if (isNaN(bsYear) || isNaN(bsMonth) || isNaN(bsDay)) {
        return withRateLimitHeaders(
          NextResponse.json(
            {
              success: false,
              error: "ValidationError",
              message: "Provide either 'bs_year', 'bs_month', 'bs_day' or 'ad_date=YYYY-MM-DD'.",
            },
            { status: 400 }
          ),
          auth?.rateLimit
        );
      }
      convData = bsToAd(bsYear, bsMonth, bsDay);
    }
  } catch (err: any) {
    return withRateLimitHeaders(
      NextResponse.json(
        {
          success: false,
          error: "InvalidDateRange",
          message: err.message,
        },
        { status: 400 }
      ),
      auth?.rateLimit
    );
  }

  // Load from database for the active source
  const source = await getActiveCalendarSource();
  let dbDate = await prisma.calendarDate.findFirst({
    where: {
      source,
      bsYear,
      bsMonth,
      bsDay,
    },
    include: {
      events: {
        include: {
          event: true,
        },
      },
    },
  });

  // Fall back to any source record if the active source is not synced yet
  if (!dbDate) {
    dbDate = await prisma.calendarDate.findFirst({
      where: {
        bsYear,
        bsMonth,
        bsDay,
      },
      orderBy: { source: "asc" },
      include: {
        events: {
          include: {
            event: true,
          },
        },
      },
    });
  }

  const adDate = new Date(convData.ad.isoDate);
  const panFallback = calculatePanchanga(adDate);

  const responsePayload = {
    bs: convData.bs,
    ad: convData.ad,
    tithi: {
      nameNp: dbDate?.tithiNameNp || panFallback.tithi.nameNp,
      nameEn: dbDate?.tithiNameEn || panFallback.tithi.nameEn,
      short: dbDate?.tithiShort || panFallback.tithi.nameNp.split(" ")[0],
      paksha: dbDate?.paksha || panFallback.tithi.paksha,
    },
    panchanga: {
      nakshatra: dbDate?.nakshatra || panFallback.nakshatra.nameNp,
      nakshatraIndex: dbDate?.nakshatraIndex || panFallback.nakshatra.index,
      yogaIndex: dbDate?.yogaIndex || panFallback.yoga.index,
      karanaIndex: dbDate?.karanaIndex || panFallback.karana.index,
      sunrise: dbDate?.sunrise || panFallback.astronomy.sunrise,
      sunset: dbDate?.sunset || panFallback.astronomy.sunset,
      moonrise: dbDate?.moonrise || panFallback.astronomy.moonrise,
      moonset: dbDate?.moonset || panFallback.astronomy.moonset,
    },
    isHoliday: dbDate?.isHoliday ?? (convData.ad.dayOfWeek === 6),
    holidayReason: dbDate?.holidayReason || (convData.ad.dayOfWeek === 6 ? "Saturday Weekend" : null),
    events: (dbDate?.events || [])
      .filter(
        (e) =>
          e.event.source === source ||
          e.event.source === "MANUAL_ADMIN" ||
          e.event.source === "SYSTEM"
      )
      .map((e) => ({
        id: e.event.id,
        titleNp: e.event.titleNp,
        titleEn: e.event.titleEn,
        eventType: e.event.eventType,
        isPublicHoliday: e.event.isPublicHoliday,
        imageUrl: e.event.imageUrl,
        articleUrl: e.event.articleUrl,
        source: e.event.source,
      })),
  };

  const duration = Date.now() - startTime;
  if (auth) {
    logApiUsage(
      auth.apiKey.id,
      "/api/v1/calendar/date",
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
      data: responsePayload,
    }),
    auth?.rateLimit
  );
}
