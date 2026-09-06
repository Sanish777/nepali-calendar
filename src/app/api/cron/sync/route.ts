import { NextRequest, NextResponse } from "next/server";
import { syncMonthCalendar } from "@/lib/scraper/reconciler";
import { getTodayDate } from "@/lib/nepali-calendar/converter";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // Vercel cron jobs send this header; allows the scheduled run to authenticate
  // without committing the CRON_SECRET.
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";

  const url = new URL(req.url);
  const secretHeader = req.headers.get("authorization");
  const secretParam = url.searchParams.get("secret");

  const expectedSecret = process.env.CRON_SECRET || "miti-cron-sync-secret-key";

  const isAuthorized =
    isVercelCron ||
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

    const targets = [
      { yearBs: currentYear, monthBs: currentMonth, source: "HAMROPATRO" as const },
      { yearBs: nextYear, monthBs: nextMonth, source: "HAMROPATRO" as const },
      { yearBs: currentYear, monthBs: currentMonth, source: "NEPALICALENDAR" as const },
      { yearBs: nextYear, monthBs: nextMonth, source: "NEPALICALENDAR" as const },
    ];

    // Sync independently so one source failing (e.g. anti-bot) never blocks others
    const settled = await Promise.allSettled(
      targets.map((t) => syncMonthCalendar(t))
    );

    const results = settled.map((r) =>
      r.status === "fulfilled" ? r.value : { success: false, error: r.reason?.message || String(r.reason) }
    );

    // Retention: trim old API usage logs (one row per request — the growth table)
    // and scraper job logs to keep the database lean.
    const USAGE_LOG_RETENTION_DAYS = 90;
    const JOB_LOG_RETENTION_DAYS = 30;

    const usageCutoff = new Date(Date.now() - USAGE_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const jobCutoff = new Date(Date.now() - JOB_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const usageDeleted = await prisma.apiUsageLog.deleteMany({
      where: { timestamp: { lt: usageCutoff } },
    });
    const jobDeleted = await prisma.scraperJobLog.deleteMany({
      where: { startedAt: { lt: jobCutoff } },
    });

    return NextResponse.json({
      success: true,
      message: "Scheduled cron sync executed successfully.",
      timestamp: new Date().toISOString(),
      results,
      cleanup: {
        apiUsageLogDeleted: usageDeleted.count,
        scraperJobLogDeleted: jobDeleted.count,
      },
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