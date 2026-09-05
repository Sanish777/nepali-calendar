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
  if (!admin) return NextResponse.json({ success: false, message: "Forbidden: Admin access required." }, { status: 403 });

  const [
    totalUsers,
    totalApiKeys,
    totalEvents,
    totalRequests,
    totalDates,
    recentScraperJobs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.apiKey.count(),
    prisma.calendarEvent.count(),
    prisma.apiUsageLog.count(),
    prisma.calendarDate.count(),
    prisma.scraperJobLog.findMany({
      take: 10,
      orderBy: { startedAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    success: true,
    stats: {
      totalUsers,
      totalApiKeys,
      totalEvents,
      totalRequests,
      totalDates,
    },
    recentScraperJobs,
  });
}
