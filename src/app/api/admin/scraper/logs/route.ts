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
  if (!admin) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim();
  const status = url.searchParams.get("status")?.trim();
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") || "10", 10) || 10, 1),
    100
  );

  const where: any = {};
  if (search) {
    where.source = { contains: search, mode: "insensitive" };
  }
  if (status === "RUNNING" || status === "SUCCESS" || status === "FAILED") {
    where.status = status;
  }

  const [total, logs] = await Promise.all([
    prisma.scraperJobLog.count({ where }),
    prisma.scraperJobLog.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    success: true,
    logs,
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  });
}
