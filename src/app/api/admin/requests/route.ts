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
  if (!admin)
    return NextResponse.json(
      { success: false, message: "Forbidden: Admin access required." },
      { status: 403 }
    );

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim();
  const method = url.searchParams.get("method")?.trim().toUpperCase();
  const status = url.searchParams.get("status")?.trim();
  const from = url.searchParams.get("from")?.trim();
  const to = url.searchParams.get("to")?.trim();
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 1),
    100
  );

  const where: any = {};
  if (method && ["GET", "POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    where.method = method;
  }
  if (status && Number.isInteger(parseInt(status, 10))) {
    where.statusCode = parseInt(status, 10);
  }
  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) where.timestamp = { ...(where.timestamp || {}), gte: fromDate };
  }
  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      where.timestamp = { ...(where.timestamp || {}), lte: toDate };
    }
  }
  if (search) {
    where.apiKey = {
      user: {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      },
    };
  }

  const [total, requests] = await Promise.all([
    prisma.apiUsageLog.count({ where }),
    prisma.apiUsageLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        apiKey: {
          select: {
            keyPrefix: true,
            name: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    requests: requests.map((r) => ({
      id: r.id,
      endpoint: r.endpoint,
      method: r.method,
      statusCode: r.statusCode,
      responseTimeMs: r.responseTimeMs,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      timestamp: r.timestamp,
      keyPrefix: r.apiKey?.keyPrefix,
      keyName: r.apiKey?.name,
      userId: r.apiKey?.user?.id,
      userName: r.apiKey?.user?.name,
      userEmail: r.apiKey?.user?.email,
    })),
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  });
}