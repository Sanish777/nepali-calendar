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

  if (!token) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      subscription: {
        include: {
          plan: true,
        },
      },
      apiKeys: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          rateLimitPerMinute: true,
          monthlyLimit: true,
          totalUsage: true,
          monthlyUsage: true,
          lastUsedAt: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationName: user.organizationName,
      subscription: user.subscription
        ? {
            planCode: user.subscription.plan.code,
            planName: user.subscription.plan.name,
            status: user.subscription.status,
            requestsPerMinute:
              user.subscription.customRpm ?? user.subscription.plan.requestsPerMinute,
            monthlyRequestLimit:
              user.subscription.customMonthlyLimit ?? user.subscription.plan.monthlyRequestLimit,
            currentPeriodEnd: user.subscription.currentPeriodEnd,
          }
        : null,
      apiKeys: user.apiKeys,
    },
  });
}
