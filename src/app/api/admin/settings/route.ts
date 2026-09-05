import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import {
  CALENDAR_SOURCES,
  getActiveCalendarSource,
  setActiveCalendarSource,
  type CalendarSource,
} from "@/lib/settings";

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

  const activeSource = await getActiveCalendarSource();

  return NextResponse.json({
    success: true,
    data: {
      calendarSource: activeSource,
      availableSources: CALENDAR_SOURCES,
      all: [
        {
          key: "ACTIVE_CALENDAR_SOURCE",
          value: activeSource,
        },
      ],
    },
  });
}

export async function PUT(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { calendarSource } = body;

  if (!(typeof calendarSource === "string" && calendarSource in CALENDAR_SOURCES)) {
    return NextResponse.json(
      { success: false, message: `calendarSource must be one of: ${Object.keys(CALENDAR_SOURCES).join(", ")}.` },
      { status: 400 }
    );
  }

  const activeSource = await setActiveCalendarSource(calendarSource as CalendarSource);

  return NextResponse.json({
    success: true,
    message: `Active calendar source set to ${activeSource}.`,
    data: { calendarSource: activeSource },
  });
}