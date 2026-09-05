import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  let token = req.cookies.get("miti_token")?.value;
  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const auth = verifyToken(token);
  if (!auth) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: {
      subscription: { include: { plan: true } },
      apiKeys: { select: { id: true } },
    },
  });

  const apiKeyIds = (user?.apiKeys || []).map((k) => k.id);

  // Today start
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [todayRequests, recentLogs] = await Promise.all([
    prisma.apiUsageLog.count({
      where: {
        apiKeyId: { in: apiKeyIds },
        timestamp: { gte: todayStart },
      },
    }),
    prisma.apiUsageLog.findMany({
      where: {
        apiKeyId: { in: apiKeyIds },
      },
      orderBy: { timestamp: "desc" },
      take: 20,
      select: {
        id: true,
        endpoint: true,
        method: true,
        statusCode: true,
        responseTimeMs: true,
        timestamp: true,
      },
    }),
  ]);

  const sub = user?.subscription;
  const plan = sub?.plan;
  const monthlyLimit = sub?.customMonthlyLimit ?? plan?.monthlyRequestLimit ?? 1000;
  const rpm = sub?.customRpm ?? plan?.requestsPerMinute ?? 60;

  // Sum total usage across user's keys
  const totalMonthlyUsage = await prisma.apiKey.aggregate({
    where: { userId: auth.userId, isActive: true },
    _sum: { monthlyUsage: true },
  });

  const used = totalMonthlyUsage._sum.monthlyUsage || 0;
  const percentage = Math.min(100, Math.round((used / monthlyLimit) * 100));

  return NextResponse.json({
    success: true,
    stats: {
      requestsToday: todayRequests,
      monthlyUsed: used,
      monthlyLimit,
      monthlyRemaining: Math.max(0, monthlyLimit - used),
      quotaPercentage: percentage,
      rateLimitRpm: rpm,
      planName: plan?.name || "Free Tier",
      planCode: plan?.code || "FREE",
    },
    recentLogs,
  });
}
