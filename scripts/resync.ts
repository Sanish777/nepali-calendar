import { prisma } from "../src/lib/prisma";
import { syncMonthCalendar } from "../src/lib/scraper/reconciler";

async function main() {
  const year = parseInt(process.argv[2] || "2083", 10);
  const months = (process.argv[3] || "4,5,6,8").split(",").map((s) => parseInt(s, 10));
  for (const m of months) {
    const r = await syncMonthCalendar({ yearBs: year, monthBs: m, source: "NEPCALENDARSCRAPE" });
    console.log(r.message);
  }
  await prisma.$disconnect();
}

void main();