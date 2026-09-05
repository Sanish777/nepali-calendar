import { prisma } from "./src/lib/prisma";
async function run() {
  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            subscription: {
              select: {
                customRpm: true,
                customMonthlyLimit: true,
                plan: {
                  select: {
                    requestsPerMinute: true,
                    monthlyRequestLimit: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    console.log("Success fetching keys");
  } catch (e) {
    console.error(e);
  }
}
run();
