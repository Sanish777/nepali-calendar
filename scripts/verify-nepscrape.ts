import { scrapeNepCalendarScrapeMonth } from "../src/lib/scraper/nepcalendarscrape-scraper";

async function main() {
  const year = parseInt(process.argv[2] || "2083", 10);
  const month = parseInt(process.argv[3] || "6", 10);

  const result = await scrapeNepCalendarScrapeMonth(year, month);
  console.log(`source=${result?.source} year=${year} month=${month} days=${result?.days.length}`);
  for (const d of result?.days || []) {
    for (const ev of d.events) {
      const latin = /[A-Za-z]/.test(ev.titleNp);
      console.log(`${d.dayBs}\t${latin ? "LATIN" : "np   "}\t${ev.titleNp}\t| ${ev.titleEn}`);
    }
  }
}

void main();