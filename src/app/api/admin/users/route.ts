import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, hashPassword } from "@/lib/auth/jwt";

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
  const role = url.searchParams.get("role")?.trim();
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") || "10", 10) || 10, 1),
    100
  );

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role === "ADMIN" || role === "USER") {
    where.role = role;
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
      subscription: {
        include: {
          plan: true,
        },
      },
      apiKeys: {
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          rateLimitPerMinute: true,
          monthlyLimit: true,
          totalUsage: true,
          monthlyUsage: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
  })]);

  return NextResponse.json({
    success: true,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      organizationName: u.organizationName,
      createdAt: u.createdAt,
      subscription: u.subscription
        ? {
            id: u.subscription.id,
            planId: u.subscription.planId,
            planCode: u.subscription.plan.code,
            status: u.subscription.status,
            customRpm: u.subscription.customRpm,
            customMonthlyLimit: u.subscription.customMonthlyLimit,
            effectiveRpm: u.subscription.customRpm ?? u.subscription.plan.requestsPerMinute,
            effectiveMonthlyLimit:
              u.subscription.customMonthlyLimit ?? u.subscription.plan.monthlyRequestLimit,
          }
        : null,
      apiKeysCount: u.apiKeys.length,
      apiKeys: u.apiKeys,
    })),
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  });
}

export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, email, password } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ success: false, message: "Email already exists" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  
  // Get a fallback plan just in case we need one for schema constraint
  const fallbackPlan = await prisma.subscriptionPlan.findFirst();

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'USER',
      subscription: fallbackPlan ? {
        create: {
          planId: fallbackPlan.id,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
        }
      } : undefined
    }
  });

  return NextResponse.json({ success: true, user });
}

export async function PUT(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { userId, customRpm, customMonthlyLimit, role, apiKeyId, keyRpm, keyMonthlyLimit } = body;

  if (!userId) return NextResponse.json({ success: false, message: "userId is required." }, { status: 400 });

  if (role) {
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  if (customRpm !== undefined || customMonthlyLimit !== undefined) {
    const fallbackPlan = await prisma.subscriptionPlan.findFirst();
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        ...(customRpm !== undefined && { customRpm: customRpm ? parseInt(customRpm, 10) : null }),
        ...(customMonthlyLimit !== undefined && {
          customMonthlyLimit: customMonthlyLimit ? parseInt(customMonthlyLimit, 10) : null,
        }),
      },
      create: {
        userId,
        planId: fallbackPlan!.id,
        customRpm: customRpm ? parseInt(customRpm, 10) : null,
        customMonthlyLimit: customMonthlyLimit ? parseInt(customMonthlyLimit, 10) : null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
      },
    });
  }

  if (apiKeyId) {
    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        ...(keyRpm !== undefined && {
          rateLimitPerMinute: keyRpm ? parseInt(keyRpm, 10) : null,
        }),
        ...(keyMonthlyLimit !== undefined && {
          monthlyLimit: keyMonthlyLimit ? parseInt(keyMonthlyLimit, 10) : null,
        }),
      },
    });
  }

  return NextResponse.json({
    success: true,
    message: "User updated successfully.",
  });
}
