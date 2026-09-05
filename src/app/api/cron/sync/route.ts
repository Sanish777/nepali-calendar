import { NextRequest, NextResponse } from "next/server";
import { syncMonthCalendar } from "@/lib/scraper/reconciler";
import { getTodayDate } from "@/lib/nepali-calendar/converter";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secretHeader = req.headers.get("authorization");
  const secretParam = url.searchParams.get("secret");

  const expectedSecret = process.env.CRON_SECRET || "miti-cron-sync-secret-key";

  const isAuthorized =
    secretParam === expectedSecret ||
    (secretHeader && secretHeader === `Bearer ${expectedSecret}`);

  if (!isAuthorized) {
    return NextResponse.json({ success: false, message: "Unauthorized cron execution." }, { status: 401 });
  }

  try {
    const today = getTodayDate();
    const currentYear = today.bs.year;
    const currentMonth = today.bs.month;

    // Next month calculation
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

    const results = [];

    // Sync current month
    const currentRes = await syncMonthCalendar({
      yearBs: currentYear,
      monthBs: currentMonth,
      source: "HAMROPATRO",
    });
    results.push(currentRes);

    // Sync next month
    const nextRes = await syncMonthCalendar({
      yearBs: nextYear,
      monthBs: nextMonth,
      source: "HAMROPATRO",
    });
    results.push(nextRes);

    return NextResponse.json({
      success: true,
      message: "Scheduled cron sync executed successfully.",
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message || "Cron sync failed.",
      },
      { status: 500 }
    );
  }
}
