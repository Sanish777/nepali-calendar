import { prisma } from "./prisma";
import { hashPassword } from "./auth/jwt";
import { syncMonthCalendar } from "./scraper/reconciler";

export async function runSeed() {
  console.log("🌱 Starting database seeding...");

  // 1. Create Default Subscription Plans
  const plans = [
    {
      code: "FREE",
      name: "Free Tier",
      description: "For personal projects, students, and evaluation.",
      priceNpr: 0,
      priceUsd: 0,
      requestsPerMinute: 60,
      monthlyRequestLimit: 1000,
      features: [
        "BS to AD & AD to BS Conversion",
        "Today's Date & Basic Info",
        "60 Requests / Minute",
        "1,000 Requests / Month",
        "Community Support",
      ],
    },
    {
      code: "STARTER",
      name: "Starter Developer",
      description: "For small web apps, blogs, and startup portals.",
      priceNpr: 999,
      priceUsd: 10,
      requestsPerMinute: 300,
      monthlyRequestLimit: 25000,
      features: [
        "Full Month & Year Calendar Grids",
        "All Holidays & Festivals",
        "Panchanga Astronomy Feeds",
        "300 Requests / Minute",
        "25,000 Requests / Month",
        "Email Support",
      ],
    },
    {
      code: "PRO",
      name: "Professional Business",
      description: "For commercial apps, fintech, attendance systems, and media portals.",
      priceNpr: 2999,
      priceUsd: 30,
      requestsPerMinute: 1200,
      monthlyRequestLimit: 200000,
      features: [
        "High-performance low-latency endpoints",
        "Full Panchanga & Auspicious Muhurat (साहित)",
        "Embeddable Calendar JS Widget",
        "1,200 Requests / Minute",
        "200,000 Requests / Month",
        "Priority Support & 99.9% SLA",
      ],
    },
    {
      code: "ENTERPRISE",
      name: "Enterprise Custom",
      description: "For banks, telecom, government, and large-scale enterprises.",
      priceNpr: 9999,
      priceUsd: 100,
      requestsPerMinute: 5000,
      monthlyRequestLimit: 2000000,
      features: [
        "Admin-customized rate limits & quotas",
        "Bulk conversion & Yearly payload export",
        "Dedicated Database Read Replicas",
        "Custom Event Synchronization",
        "24/7 Phone & Slack Support",
      ],
    },
  ];

  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        description: p.description,
        priceNpr: p.priceNpr,
        priceUsd: p.priceUsd,
        requestsPerMinute: p.requestsPerMinute,
        monthlyRequestLimit: p.monthlyRequestLimit,
        features: p.features,
      },
      create: p,
    });
  }
  console.log("✓ Subscription plans created.");

  const proPlan = await prisma.subscriptionPlan.findUnique({ where: { code: "PRO" } });
  const enterprisePlan = await prisma.subscriptionPlan.findUnique({ where: { code: "ENTERPRISE" } });

  // 2. Create Admin User
  const adminPasswordHash = await hashPassword("Admin@123456");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@miti.dev" },
    update: {
      name: "Super Admin",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
    },
    create: {
      email: "admin@miti.dev",
      name: "Super Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      organizationName: "Miti Engine Admin",
    },
  });

  if (enterprisePlan) {
    await prisma.subscription.upsert({
      where: { userId: adminUser.id },
      update: {},
      create: {
        userId: adminUser.id,
        planId: enterprisePlan.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
      },
    });
  }
  console.log("✓ Admin user created: admin@miti.dev (Admin@123456)");

  // 3. Create Developer User
  const devPasswordHash = await hashPassword("Dev@123456");
  const devUser = await prisma.user.upsert({
    where: { email: "dev@example.com" },
    update: {
      name: "Ada Lovelace",
      role: "USER",
      organizationName: "Kathmandu Labs",
      passwordHash: devPasswordHash,
    },
    create: {
      email: "dev@example.com",
      name: "Ada Lovelace",
      role: "USER",
      organizationName: "Kathmandu Labs",
      passwordHash: devPasswordHash,
    },
  });

  if (proPlan) {
    await prisma.subscription.upsert({
      where: { userId: devUser.id },
      update: {},
      create: {
        userId: devUser.id,
        planId: proPlan.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
      },
    });
  }

  // Create Demo API Key for Developer
  const demoApiKey = "np_live_demo1234567890abcdef12345678";
  await prisma.apiKey.upsert({
    where: { key: demoApiKey },
    update: {
      isActive: true,
      rateLimitPerMinute: 1200,
      monthlyLimit: 200000,
    },
    create: {
      userId: devUser.id,
      name: "Production Live Key",
      key: demoApiKey,
      keyPrefix: "np_live_demo1234...",
      rateLimitPerMinute: 1200,
      monthlyLimit: 200000,
      totalUsage: 42,
      monthlyUsage: 42,
      isActive: true,
    },
  });
  console.log("✓ Developer user created: dev@example.com (Dev@123456)");
  console.log("✓ Demo API Key created:", demoApiKey);

  // 4. Sync Calendar for BS 2083 (Current year) Months 1 to 6
  console.log("⏳ Pre-seeding calendar months for BS 2083...");
  const targetMonths = [1, 4, 5]; // Baisakh, Shrawan, Bhadra (current)
  for (const m of targetMonths) {
    try {
      console.log(`Syncing BS 2083 Month ${m}...`);
      await syncMonthCalendar({ yearBs: 2083, monthBs: m });
    } catch (e: any) {
      console.warn(`Month ${m} sync warning:`, e?.message);
    }
  }

  console.log("🎉 Database seeding complete!");
}

// Auto-run if executed directly via CLI
if (require.main === module || process.argv[1]?.includes("seed")) {
  runSeed()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("Seed failed:", e);
      process.exit(1);
    });
}
