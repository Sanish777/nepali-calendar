import { NextRequest, NextResponse } from "next/server";
import { syncMonthCalendar } from "@/lib/scraper/reconciler";
import { getTodayDate } from "@/lib/nepcalendarscrape/converter";
import { isBsYearKnown, loadLearnedYears } from "@/lib/nepcalendarscrape/bs-registry";
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
    // Hydrate learned BS years/spellings from the database.
    await loadLearnedYears();

    const today = getTodayDate();
    const currentYear = today.bs.year;
    const currentMonth = today.bs.month;

    // Next month calculation
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

    const targets = [
      { yearBs: currentYear, monthBs: currentMonth, source: "PATROSCRAPE" as const },
      { yearBs: nextYear, monthBs: nextMonth, source: "PATROSCRAPE" as const },
      { yearBs: currentYear, monthBs: currentMonth, source: "NEPCALENDARSCRAPE" as const },
      { yearBs: nextYear, monthBs: nextMonth, source: "NEPCALENDARSCRAPE" as const },
    ];

    // Yearly auto-sweep: when the live BS year is not in the hardcoded
    // reference table (a brand-new year), scrape and learn all 12 months so
    // the new year works with zero code changes. Runs until the year is known.
    const needsYearSweep = !isBsYearKnown(currentYear) || currentYear > 2090;
    let yearSweep: { success: boolean; error?: string }[] = [];
    if (needsYearSweep) {
      const swept = await Promise.allSettled(
        Array.from({ length: 12 }, (_, i) => ({
          yearBs: currentYear,
          monthBs: i + 1,
          source: "NEPCALENDARSCRAPE" as const,
        })).map((t) => syncMonthCalendar(t))
      );
      yearSweep = swept.map((r) =>
        r.status === "fulfilled" ? r.value : { success: false, error: r.reason?.message || String(r.reason) }
      );
    }

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
      yearSweep,
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