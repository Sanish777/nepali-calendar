import { prisma } from "../src/lib/prisma";
async function main() {
  const year = parseInt(process.argv[2] || "2083", 10);
  const months = (process.argv[3] || "4,5,6,8").split(",").map((s) => parseInt(s, 10));
  const src = process.argv[4] || "NEPCALENDARSCRAPE";
  const all = await prisma.calendarEvent.findMany({
    where: { source: src, bsYear: year, bsMonth: { in: months } },
    select: { id: true, bsDay: true, titleNp: true, titleEn: true },
  });
  const latin = all.filter((e) => /[A-Za-z]/.test(e.titleNp || ""));
  console.log(`source=${src} year=${year} months=${months} total=${all.length} latinTitleNp=${latin.length}`);
  for (const e of latin.slice(0, 40)) console.log(`  d${e.bsDay}\t${e.titleNp}\t<- ${e.titleEn}`);
  await prisma.$disconnect();
}
void main();
