import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiUsage, withRateLimitHeaders } from "@/lib/auth/api-key";
import { prisma } from "@/lib/prisma";
import { BS_CALENDAR_DATA, BS_MONTHS, toDevanagari } from "@/lib/nepali-calendar/bs-data";
import { getTodayDate } from "@/lib/nepali-calendar/converter";
import { getActiveCalendarSource } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { auth, errorResponse } = await authenticateApiKey(req);
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const today = getTodayDate();
  const yearBs = parseInt(url.searchParams.get("bs_year") || url.searchParams.get("year") || String(today.bs.year), 10);

  const monthLengths = BS_CALENDAR_DATA[yearBs];
  if (!monthLengths) {
    return withRateLimitHeaders(
      NextResponse.json(
        {
          success: false,
          error: "InvalidYear",
          message: `Year ${yearBs} is outside supported BS range (2000-2090).`,
        },
        { status: 400 }
      ),
      auth?.rateLimit
    );
  }

  // Fetch all holidays and major events for this year from DB (active source + manual/system)
  const source = await getActiveCalendarSource();
  const holidays = await prisma.calendarEvent.findMany({
    where: {
      bsYear: yearBs,
      isPublicHoliday: true,
      status: "PUBLISHED",
      OR: [
        { source },
        { source: "MANUAL_ADMIN" },
        { source: "SYSTEM" },
      ],
    },
    orderBy: [{ bsMonth: "asc" }, { bsDay: "asc" }],
  });

  const months = BS_MONTHS.map((m) => {
    const daysCount = monthLengths[m.monthIndex - 1];
    return {
      month_index: m.monthIndex,
      name_en: m.nameEn,
      name_np: m.nameNp,
      days_in_month: daysCount,
      days_in_month_np: toDevanagari(daysCount),
    };
  });

  const totalDays = monthLengths.reduce((a, b) => a + b, 0);

  const duration = Date.now() - startTime;
  if (auth) {
    logApiUsage(
      auth.apiKey.id,
      "/api/v1/calendar/year",
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
        year_bs: yearBs,
        year_bs_np: toDevanagari(yearBs),
        total_days: totalDays,
        months,
        public_holidays_count: holidays.length,
        public_holidays: holidays.map((h) => ({
          id: h.id,
          title_np: h.titleNp,
          title_en: h.titleEn,
          bs_month: h.bsMonth,
          bs_day: h.bsDay,
          event_type: h.eventType,
          source: h.source,
        })),
      },
    }),
    auth?.rateLimit
  );
}
