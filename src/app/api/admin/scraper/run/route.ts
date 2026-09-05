import { NextRequest, NextResponse } from "next/server";
import { syncMonthCalendar } from "@/lib/scraper/reconciler";
import { verifyToken } from "@/lib/auth/jwt";
import { CALENDAR_SOURCES, DEFAULT_CALENDAR_SOURCE, type CalendarSource } from "@/lib/settings";

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
  const { yearBs, monthBs, source } = body;

  if (!yearBs || !monthBs) {
    return NextResponse.json(
      { success: false, message: "yearBs and monthBs are required." },
      { status: 400 }
    );
  }

  const resolvedSource: CalendarSource =
    typeof source === "string" && source in CALENDAR_SOURCES
      ? (source as CalendarSource)
      : DEFAULT_CALENDAR_SOURCE;

  try {
    const result = await syncMonthCalendar({
      yearBs: parseInt(yearBs, 10),
      monthBs: parseInt(monthBs, 10),
      source: resolvedSource,
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message || "Scraper execution failed.",
      },
      { status: 500 }
    );
  }
}
