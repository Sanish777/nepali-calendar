import { prisma } from "../src/lib/prisma";
async function main() {
  const upd = await prisma.calendarEvent.updateMany({
    where: { titleNp: "Naag Tasne", titleEn: "Naag Tasne" },
    data: { titleNp: "नाग तस्ने" },
  });
  console.log("updated:", upd.count);
  await prisma.$disconnect();
}
void main();
