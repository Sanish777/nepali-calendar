import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiUsage, withRateLimitHeaders } from "@/lib/auth/api-key";
import { prisma } from "@/lib/prisma";
import { BS_CALENDAR_DATA, BS_MONTHS, WEEKDAYS, toDevanagari } from "@/lib/nepali-calendar/bs-data";
import { bsToAd, getTodayDate } from "@/lib/nepali-calendar/converter";
import { syncMonthCalendar } from "@/lib/scraper/reconciler";
import { getActiveCalendarSource } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { auth, errorResponse } = await authenticateApiKey(req);
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const today = getTodayDate();

  const yearBs = parseInt(url.searchParams.get("bs_year") || url.searchParams.get("year") || String(today.bs.year), 10);
  const monthBs = parseInt(url.searchParams.get("bs_month") || url.searchParams.get("month") || String(today.bs.month), 10);

  const monthLengths = BS_CALENDAR_DATA[yearBs];
  if (!monthLengths || monthBs < 1 || monthBs > 12) {
    return withRateLimitHeaders(
      NextResponse.json(
        {
          success: false,
          error: "InvalidMonth",
          message: `Year ${yearBs} or Month ${monthBs} is invalid. Supported BS Years: 2000-2090.`,
        },
        { status: 400 }
      ),
      auth?.rateLimit
    );
  }

  const daysInMonth = monthLengths[monthBs - 1];
  const monthMeta = BS_MONTHS[monthBs - 1];
  const source = await getActiveCalendarSource();

  // Check if month exists in DB for the active source
  let dbDates = await prisma.calendarDate.findMany({
    where: {
      source,
      bsYear: yearBs,
      bsMonth: monthBs,
    },
    orderBy: { bsDay: "asc" },
    include: {
      events: {
        include: {
          event: true,
        },
      },
    },
  });

  // If a partial month exists, top it up — but never cold-scrape a brand-new
  // source here (it blocks for ~90s on anti-bot retries), and bound the wait so
  // the API can never hang. Missing months are filled by the cron sync instead.
  if (dbDates.length > 0 && dbDates.length < daysInMonth) {
    try {
      await Promise.race([
        syncMonthCalendar({ yearBs, monthBs, source }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Sync timed out; skipping in-request reconcile.")), 8000)
        ),
      ]);
      dbDates = await prisma.calendarDate.findMany({
        where: {
          source,
          bsYear: yearBs,
          bsMonth: monthBs,
        },
        orderBy: { bsDay: "asc" },
        include: {
          events: {
            include: {
              event: true,
            },
          },
        },
      });
    } catch {
      // Continue with existing/algorithm-generated dates if scrape times out
    }
  }

  // If the active source has no data yet, fall back to what exists
  if (dbDates.length === 0) {
    dbDates = await prisma.calendarDate.findMany({
      where: {
        bsYear: yearBs,
        bsMonth: monthBs,
      },
      orderBy: [{ source: "asc" }, { bsDay: "asc" }],
      take: daysInMonth,
      include: {
        events: {
          include: {
            event: true,
          },
        },
      },
    });
  }

  // First day weekday offset
  const firstDayConv = bsToAd(yearBs, monthBs, 1);
  const startDayOfWeek = firstDayConv.ad.dayOfWeek;

  const dbDateMap = new Map<number, (typeof dbDates)[0]>();
  for (const d of dbDates) {
    dbDateMap.set(d.bsDay, d);
  }

  const days = [];
  for (let dayBs = 1; dayBs <= daysInMonth; dayBs++) {
    const dbDay = dbDateMap.get(dayBs);
    const conv = bsToAd(yearBs, monthBs, dayBs);
    const isToday = today.bs.year === yearBs && today.bs.month === monthBs && today.bs.day === dayBs;
    const isWeekend = conv.ad.dayOfWeek === 6;
    const isHoliday = dbDay?.isHoliday ?? isWeekend;

    days.push({
      year_bs: yearBs,
      month_bs: monthBs,
      day_bs: dayBs,
      year_ad: conv.ad.year,
      month_ad: conv.ad.month,
      day_ad: conv.ad.day,
      day_of_week: conv.ad.dayOfWeek,
      day_of_week_np: conv.ad.dayOfWeekNp,
      day_of_week_en: conv.ad.dayOfWeekEn,
      day_bs_np: toDevanagari(dayBs),
      day_ad_np: toDevanagari(conv.ad.day),
      is_today: isToday,
      is_weekend: isWeekend,
      is_holiday: isHoliday,
      holiday_reason: dbDay?.holidayReason || (isWeekend ? "Saturday Weekend" : null),
      tithi_short: dbDay?.tithiShort || "",
      tithi_name_np: dbDay?.tithiNameNp || "",
      tithi_name_en: dbDay?.tithiNameEn || "",
      events: (dbDay?.events || [])
        .filter(
          (e) =>
            e.event.source === source ||
            e.event.source === "MANUAL_ADMIN" ||
            e.event.source === "SYSTEM"
        )
        .map((e) => ({
          id: e.event.id,
          title_np: e.event.titleNp,
          title_en: e.event.titleEn,
          event_type: e.event.eventType,
          is_public_holiday: e.event.isPublicHoliday,
          source: e.event.source,
        })),
    });
  }

  const duration = Date.now() - startTime;
  if (auth) {
    logApiUsage(
      auth.apiKey.id,
      "/api/v1/calendar/month",
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
        month_bs: monthBs,
        month_name_np: monthMeta.nameNp,
        month_name_en: monthMeta.nameEn,
        days_in_month: daysInMonth,
        start_day_of_week: startDayOfWeek,
        weekday_headers: WEEKDAYS.map((w) => ({
          day_index: w.dayIndex,
          name_np: w.nameNp,
          name_en: w.nameEn,
          short_np: w.shortNp,
          short_en: w.shortEn,
        })),
        days,
      },
    }),
    auth?.rateLimit
  );
}
