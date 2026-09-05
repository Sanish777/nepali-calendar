import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiUsage, withRateLimitHeaders } from "@/lib/auth/api-key";
import { prisma } from "@/lib/prisma";
import { getActiveCalendarSource } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { auth, errorResponse } = await authenticateApiKey(req);
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const yearBs = url.searchParams.get("bs_year") ? parseInt(url.searchParams.get("bs_year")!, 10) : undefined;
  const monthBs = url.searchParams.get("bs_month") ? parseInt(url.searchParams.get("bs_month")!, 10) : undefined;
  const holidayOnly = url.searchParams.get("holiday_only") === "true";
  const search = url.searchParams.get("search")?.trim();
  const source = await getActiveCalendarSource();

  const where: any = {
    OR: [
      { source },
      { source: "MANUAL_ADMIN" },
      { source: "SYSTEM" },
    ],
    status: "PUBLISHED",
  };

  if (yearBs) where.bsYear = yearBs;
  if (monthBs) where.bsMonth = monthBs;
  if (holidayOnly) where.isPublicHoliday = true;
  if (search) {
    delete where.OR;
    delete where.status;
    where.AND = [
      {
        OR: [
          { source },
          { source: "MANUAL_ADMIN" },
          { source: "SYSTEM" },
        ],
      },
      { status: "PUBLISHED" },
      {
        OR: [
          { titleNp: { contains: search, mode: "insensitive" } },
          { titleEn: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: [
      { bsYear: "asc" },
      { bsMonth: "asc" },
      { bsDay: "asc" },
    ],
    take: 200,
  });

  const duration = Date.now() - startTime;
  if (auth) {
    logApiUsage(
      auth.apiKey.id,
      "/api/v1/events",
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
      count: events.length,
      data: events.map((e) => ({
        id: e.id,
        title_np: e.titleNp,
        title_en: e.titleEn,
        description: e.description,
        event_type: e.eventType,
        is_public_holiday: e.isPublicHoliday,
        bs_year: e.bsYear,
        bs_month: e.bsMonth,
        bs_day: e.bsDay,
        source: e.source,
        image_url: e.imageUrl,
        article_url: e.articleUrl,
      })),
    }),
    auth?.rateLimit
  );
}
