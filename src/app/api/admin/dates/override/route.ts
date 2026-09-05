import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";
import { getActiveCalendarSource } from "@/lib/settings";

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

export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { bsYear, bsMonth, bsDay, customTithiNp, customTithiEn, isHolidayOverride, holidayReason, notes } = body;

  if (!bsYear || !bsMonth || !bsDay) {
    return NextResponse.json({ success: false, message: "bsYear, bsMonth, and bsDay are required." }, { status: 400 });
  }

  // Upsert DateOverride
  const override = await prisma.dateOverride.upsert({
    where: {
      bsYear_bsMonth_bsDay: {
        bsYear: parseInt(bsYear, 10),
        bsMonth: parseInt(bsMonth, 10),
        bsDay: parseInt(bsDay, 10),
      },
    },
    update: {
      customTithiNp,
      customTithiEn,
      isHolidayOverride: isHolidayOverride !== undefined ? Boolean(isHolidayOverride) : undefined,
      holidayReason,
      notes,
      updatedById: admin.userId,
    },
    create: {
      bsYear: parseInt(bsYear, 10),
      bsMonth: parseInt(bsMonth, 10),
      bsDay: parseInt(bsDay, 10),
      customTithiNp,
      customTithiEn,
      isHolidayOverride: isHolidayOverride !== undefined ? Boolean(isHolidayOverride) : undefined,
      holidayReason,
      notes,
      updatedById: admin.userId,
    },
  });

  // Apply directly to CalendarDate if it exists (active source row first, else any)
  const source = await getActiveCalendarSource();
  const calDate =
    (await prisma.calendarDate.findFirst({
      where: {
        source,
        bsYear: parseInt(bsYear, 10),
        bsMonth: parseInt(bsMonth, 10),
        bsDay: parseInt(bsDay, 10),
      },
    })) ||
    (await prisma.calendarDate.findFirst({
      where: {
        bsYear: parseInt(bsYear, 10),
        bsMonth: parseInt(bsMonth, 10),
        bsDay: parseInt(bsDay, 10),
      },
      orderBy: { source: "asc" },
    }));

  if (calDate) {
    await prisma.calendarDate.update({
      where: { id: calDate.id },
      data: {
        tithiNameNp: customTithiNp || undefined,
        tithiNameEn: customTithiEn || undefined,
        tithiShort: customTithiNp || undefined,
        isHoliday: isHolidayOverride !== undefined ? Boolean(isHolidayOverride) : undefined,
        holidayReason: holidayReason || undefined,
      },
    });
  }

  return NextResponse.json({
    success: true,
    message: `Date override saved for BS ${bsYear}-${bsMonth}-${bsDay}`,
    override,
  });
}
