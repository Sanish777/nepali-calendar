import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

function requireAdmin(req: NextRequest) {
  let token = req.cookies.get("miti_token")?.value;
  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }
  if (!token) return null;
  const session = verifyToken(token);
  return session?.role === "ADMIN" ? session : null;
}

export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const yearBs = url.searchParams.get("year") ? parseInt(url.searchParams.get("year")!, 10) : undefined;
  const monthBs = url.searchParams.get("month") ? parseInt(url.searchParams.get("month")!, 10) : undefined;
  const search = url.searchParams.get("search")?.trim();
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 1),
    100
  );

  const where: any = {};
  if (yearBs) where.bsYear = yearBs;
  if (monthBs) where.bsMonth = monthBs;
  if (search) {
    where.OR = [
      { titleNp: { contains: search, mode: "insensitive" } },
      { titleEn: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, events] = await Promise.all([
    prisma.calendarEvent.count({ where }),
    prisma.calendarEvent.findMany({
      where,
      orderBy: [{ bsYear: "desc" }, { bsMonth: "asc" }, { bsDay: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    success: true,
    events,
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  });
}

export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    titleNp,
    titleEn,
    description,
    eventType,
    isPublicHoliday,
    recurrence,
    bsYear,
    bsMonth,
    bsDay,
    imageUrl,
    articleUrl,
  } = body;

  if (!titleNp || !bsMonth || !bsDay) {
    return NextResponse.json(
      { success: false, message: "titleNp, bsMonth, and bsDay are required." },
      { status: 400 }
    );
  }

  const newEvent = await prisma.calendarEvent.create({
    data: {
      titleNp,
      titleEn: titleEn || titleNp,
      description,
      eventType: eventType || (isPublicHoliday ? "HOLIDAY" : "FESTIVAL"),
      isPublicHoliday: Boolean(isPublicHoliday),
      recurrence: recurrence || "ONE_OFF",
      bsYear: bsYear ? parseInt(bsYear, 10) : undefined,
      bsMonth: parseInt(bsMonth, 10),
      bsDay: parseInt(bsDay, 10),
      source: "MANUAL_ADMIN",
      status: "PUBLISHED",
      imageUrl,
      articleUrl,
      createdById: admin.userId,
    },
  });

  // If this date exists in CalendarDate, link it and update isHoliday flag if public holiday
  if (bsYear) {
    const calDate = await prisma.calendarDate.findFirst({
      where: {
        bsYear: parseInt(bsYear, 10),
        bsMonth: parseInt(bsMonth, 10),
        bsDay: parseInt(bsDay, 10),
      },
      orderBy: { source: "asc" },
    });

    if (calDate) {
      await prisma.calendarEventDate.upsert({
        where: {
          dateId_eventId: {
            dateId: calDate.id,
            eventId: newEvent.id,
          },
        },
        update: {},
        create: {
          dateId: calDate.id,
          eventId: newEvent.id,
        },
      });

      if (isPublicHoliday) {
        await prisma.calendarDate.update({
          where: { id: calDate.id },
          data: {
            isHoliday: true,
            holidayReason: titleEn || titleNp,
          },
        });
      }
    }
  }

  return NextResponse.json({ success: true, message: "Event created successfully.", event: newEvent });
}

export async function PUT(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, titleNp, titleEn, description, eventType, isPublicHoliday, bsYear, bsMonth, bsDay } = body;

  if (!id) return NextResponse.json({ success: false, message: "Event ID is required." }, { status: 400 });

  const updated = await prisma.calendarEvent.update({
    where: { id },
    data: {
      titleNp,
      titleEn,
      description,
      eventType,
      isPublicHoliday: Boolean(isPublicHoliday),
      bsYear: bsYear ? parseInt(bsYear, 10) : undefined,
      bsMonth: bsMonth ? parseInt(bsMonth, 10) : undefined,
      bsDay: bsDay ? parseInt(bsDay, 10) : undefined,
    },
  });

  return NextResponse.json({ success: true, message: "Event updated successfully.", event: updated });
}

export async function DELETE(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, message: "Event ID required." }, { status: 400 });

  await prisma.calendarEvent.delete({
    where: { id },
  });

  return NextResponse.json({ success: true, message: "Event deleted successfully." });
}
