import { prisma } from "../src/lib/prisma";
async function main() {
  const all = await prisma.calendarEvent.findMany({
    select: { source: true, bsYear: true, bsMonth: true, titleNp: true },
  });
  const bySrc: Record<string, number> = {};
  const byYrMo: Record<string, number> = {};
  for (const e of all) {
    if (/[A-Za-z]/.test(e.titleNp || "")) {
      bySrc[e.source] = (bySrc[e.source] || 0) + 1;
      byYrMo[`${e.source} ${e.bsYear}-${e.bsMonth}`] = (byYrMo[`${e.source} ${e.bsYear}-${e.bsMonth}`] || 0) + 1;
    }
  }
  console.log("BY SOURCE:", JSON.stringify(bySrc, null, 1));
  console.log("BY YEAR-MONTH (top):");
  Object.entries(byYrMo).sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  await prisma.$disconnect();
}
void main();
