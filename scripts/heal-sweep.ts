import { prisma } from "../src/lib/prisma";
import { syncMonthCalendar } from "../src/lib/scraper/reconciler";

async function main() {
  const all = await prisma.calendarEvent.findMany({
    where: {
      source: "NEPCALENDARSCRAPE",
      OR: [
        { titleNp: { lt: "\u0900" } },
        { titleNp: { gt: "\u097F" } },
      ],
    },
    select: { bsYear: true, bsMonth: true },
  });
  const counts = new Map<string, number>();
  let latinTotal = 0;
  for (const r of all) {
    const k = `${r.bsYear}-${r.bsMonth}`;
    counts.set(k, (counts.get(k) || 0) + 1);
    latinTotal++;
  }
  const months = [...counts.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  console.log(`latin rows total=${latinTotal}, months=${months.length}`);
  let healed = 0;
  let failed = 0;
  let i = 0;
  for (const [ym, cnt] of months) {
    const [y, m] = ym.split("-").map(Number);
    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        await syncMonthCalendar({ yearBs: y, monthBs: m, source: "NEPCALENDARSCRAPE" });
        ok = true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`FAILED ${ym} (attempt ${attempt}/3): ${msg}`);
        await new Promise((r) => setTimeout(r, 5000 * attempt));
      }
    }
    if (ok) healed++;
    else failed++;
    i++;
    if (i % 5 === 0 || i === months.length) {
      console.log(`progress ${i}/${months.length} (healed=${healed} failed=${failed})`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`DONE healed=${healed} failed=${failed}`);
  await prisma.$disconnect();
}
void main();