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

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin)
    return NextResponse.json(
      { success: false, message: "Forbidden: Admin access required." },
      { status: 403 }
    );

  const url = new URL(req.url);
  const days = Math.min(
    parseInt(url.searchParams.get("days") || "15", 10) || 15,
    60
  );
  const now = new Date();
  const startToday = startOfDay(now);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startWindow = new Date(now.getTime() - days * 86400000);

  const [
    totalUsers,
    totalApiKeys,
    totalEvents,
    totalDates,
    totalRequests,
    requestsToday,
    requestsThisMonth,
    avgAgg,
    recentRequests,
    usageByEndpoint,
    usageByKey,
    windowLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.apiKey.count(),
    prisma.calendarEvent.count(),
    prisma.calendarDate.count(),
    prisma.apiUsageLog.count(),
    prisma.apiUsageLog.count({ where: { timestamp: { gte: startToday } } }),
    prisma.apiUsageLog.count({ where: { timestamp: { gte: startOfMonth } } }),
    prisma.apiUsageLog.aggregate({ _avg: { responseTimeMs: true } }),
    prisma.apiUsageLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 4,
      include: {
        apiKey: {
          select: {
            keyPrefix: true,
            name: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    }),
    prisma.apiUsageLog.groupBy({
      by: ["endpoint", "method"],
      _count: { _all: true },
      _avg: { responseTimeMs: true },
    }),
    prisma.apiUsageLog.groupBy({
      by: ["apiKeyId"],
      where: { timestamp: { gte: startWindow } },
      _count: { _all: true },
    }),
    prisma.apiUsageLog.findMany({
      where: { timestamp: { gte: startWindow } },
      select: { timestamp: true },
      orderBy: { timestamp: "asc" },
    }),
  ]);

  const topEndpoints = usageByEndpoint
    .sort((a, b) => (b._count?._all || 0) - (a._count?._all || 0))
    .slice(0, 12);
  const topKeys = usageByKey
    .sort((a, b) => (b._count?._all || 0) - (a._count?._all || 0))
    .slice(0, 100);

  // Aggregate logs into a per-day series (fill missing days with 0)
  const series = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    series.set(d.toISOString().slice(0, 10), 0);
  }
  for (const l of windowLogs) {
    const key = l.timestamp.toISOString().slice(0, 10);
    if (series.has(key)) series.set(key, series.get(key)! + 1);
  }
  const usageByDay = Array.from(series.entries()).map(([date, requests]) => ({
    date,
    requests,
  }));

  // Resolve per-key usage into per-user usage ("used by whom")
  const keyIds = topKeys.map((k) => k.apiKeyId);
  const keyUserMap = new Map<
    string,
    { keyPrefix: string; userId: string; userName: string; userEmail: string }
  >();
  if (keyIds.length > 0) {
    const keys = await prisma.apiKey.findMany({
      where: { id: { in: keyIds } },
      select: {
        id: true,
        keyPrefix: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    for (const k of keys) {
      keyUserMap.set(k.id, {
        keyPrefix: k.keyPrefix,
        userId: k.user.id,
        userName: k.user.name,
        userEmail: k.user.email,
      });
    }
  }

  const userAgg = new Map<
    string,
    {
      userId: string;
      name: string;
      email: string;
      requests: number;
      keys: number;
      keyPrefixes: string[];
    }
  >();
  for (const row of topKeys) {
    const info = keyUserMap.get(row.apiKeyId);
    if (!info) continue;
    const u = userAgg.get(info.userId) || {
      userId: info.userId,
      name: info.userName,
      email: info.userEmail,
      requests: 0,
      keys: 0,
      keyPrefixes: [],
    };
    u.requests += row._count?._all || 0;
    u.keys += 1;
    if (!u.keyPrefixes.includes(info.keyPrefix)) u.keyPrefixes.push(info.keyPrefix);
    userAgg.set(info.userId, u);
  }
  const usageByUser = Array.from(userAgg.values())
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 50);

  // Active keys in the window
  const activeKeysThisMonth = await prisma.apiUsageLog
    .groupBy({
      by: ["apiKeyId"],
      where: { timestamp: { gte: startOfMonth } },
    })
    .then((r) => r.length);

  return NextResponse.json({
    success: true,
    generatedAt: now.toISOString(),
    dashboard: {
      windowDays: days,
      kpis: {
        totalUsers,
        totalApiKeys,
        totalEvents,
        totalDates,
        totalRequests,
        requestsToday,
        requestsThisMonth,
        activeKeysThisMonth,
        avgResponseTimeMs: Math.round(avgAgg._avg.responseTimeMs || 0),
      },
      usageByDay,
      usageByEndpoint: topEndpoints.map((e) => ({
        endpoint: e.endpoint,
        method: e.method,
        requests: e._count?._all || 0,
        avgResponseTimeMs: Math.round(e._avg?.responseTimeMs || 0),
      })),
      usageByUser,
      activeApiKeysThisMonth: activeKeysThisMonth,
      recentRequests: recentRequests.map((r) => ({
        id: r.id,
        endpoint: r.endpoint,
        method: r.method,
        statusCode: r.statusCode,
        responseTimeMs: r.responseTimeMs,
        ipAddress: r.ipAddress,
        timestamp: r.timestamp,
        keyPrefix: r.apiKey?.keyPrefix,
        keyName: r.apiKey?.name,
        userName: r.apiKey?.user?.name,
        userEmail: r.apiKey?.user?.email,
      })),
    },
  });
}