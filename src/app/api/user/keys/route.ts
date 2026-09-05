import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";
import { generateApiKey } from "@/lib/auth/api-key";

function getAuthUser(req: NextRequest) {
  let token = req.cookies.get("miti_token")?.value;
  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }
  return token ? verifyToken(token) : null;
}

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const keys = await prisma.apiKey.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      rateLimitPerMinute: true,
      monthlyLimit: true,
      totalUsage: true,
      monthlyUsage: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, keys });
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = body.name || "API Key";

  // Check user's subscription plan to get default limits
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: { subscription: { include: { plan: true } } },
  });

  const sub = user?.subscription;
  const plan = sub?.plan;

  const rpm = sub?.customRpm ?? plan?.requestsPerMinute ?? 60;
  const monthly = sub?.customMonthlyLimit ?? plan?.monthlyRequestLimit ?? 1000;

  const { fullKey, keyPrefix } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      userId: auth.userId,
      name,
      key: fullKey,
      keyPrefix,
      rateLimitPerMinute: rpm,
      monthlyLimit: monthly,
    },
  });

  return NextResponse.json({
    success: true,
    message: "API Key created successfully.",
    apiKey: {
      id: apiKey.id,
      name: apiKey.name,
      key: fullKey, // Revealed once upon creation
      keyPrefix,
      rateLimitPerMinute: rpm,
      monthlyLimit: monthly,
      createdAt: apiKey.createdAt,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const keyId = url.searchParams.get("id");
  if (!keyId) return NextResponse.json({ success: false, message: "Key ID required." }, { status: 400 });

  const existing = await prisma.apiKey.findFirst({
    where: { id: keyId, userId: auth.userId },
  });

  if (!existing) {
    return NextResponse.json({ success: false, message: "API key not found." }, { status: 404 });
  }

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true, message: "API key revoked." });
}
