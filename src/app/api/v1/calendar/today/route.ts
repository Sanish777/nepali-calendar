import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiUsage, withRateLimitHeaders } from "@/lib/auth/api-key";
import { getTodayDate } from "@/lib/nepali-calendar/converter";
import { prisma } from "@/lib/prisma";
import { calculatePanchanga } from "@/lib/nepali-calendar/panchanga";
import { getActiveCalendarSource } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { auth, errorResponse } = await authenticateApiKey(req);
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);

  const today = getTodayDate();
  const adDate = new Date(today.ad.isoDate);
  const source = await getActiveCalendarSource();

  // Check database for full record for the active source
  let dbDate = await prisma.calendarDate.findFirst({
    where: {
      source,
      bsYear: today.bs.year,
      bsMonth: today.bs.month,
      bsDay: today.bs.day,
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
        bsYear: today.bs.year,
        bsMonth: today.bs.month,
        bsDay: today.bs.day,
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

  const panFallback = calculatePanchanga(adDate);

  const responsePayload = {
    bs: today.bs,
    ad: today.ad,
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
    isHoliday: dbDate?.isHoliday ?? (today.ad.dayOfWeek === 6),
    holidayReason: dbDate?.holidayReason || (today.ad.dayOfWeek === 6 ? "Saturday Weekend" : null),
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
      "/api/v1/calendar/today",
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
