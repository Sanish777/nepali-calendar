import { parseCells } from "../src/lib/scraper/nepcalendarscrape-scraper";

const BASE = "https://nepalicalendar.rat32.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const SLUGS: Record<number, string> = {
  1: "baisakh", 2: "jestha", 3: "ashad", 4: "shrawan", 5: "bhadra", 6: "ashwin",
  7: "kartik", 8: "mangsir", 9: "poush", 10: "magh", 11: "falgun", 12: "chaitra",
};

async function get(path: string): Promise<string> {
  const r = await fetch(BASE + path, { headers: { "User-Agent": UA }, cache: "no-store" });
  return r.text();
}

function day1Tithi(html: string): string {
  for (const c of parseCells(html)) if (c.bsDay === 1) return c.tithiEn;
  return "";
}

async function main() {
  const year = 2083;
  for (let m = 1; m <= 12; m++) {
    const enHtml = await get(`/${year}/${SLUGS[m]}`);
    const enTithi = day1Tithi(enHtml);
    // candidate spellings: capitalized slug, BS_MONTHS nameEn style, and nameEn as-is
    const cap = SLUGS[m][0].toUpperCase() + SLUGS[m].slice(1);
    const candidates = [cap];
    const hits: string[] = [];
    for (const cand of candidates) {
      try {
        const npHtml = await get(`/index_nep.php?year=${year}&month=${cand}`);
        const npTithi = day1Tithi(npHtml);
        if (npTithi && npTithi === enTithi) hits.push(`${cand}(tithi=${npTithi})`);
        else hits.push(`${cand}(MISMATCH en=${enTithi} np=${npTithi})`);
      } catch (e) {
        hits.push(`${cand}(ERR ${e})`);
      }
    }
    console.log(`m=${m} slug=${SLUGS[m]} enTithi=${enTithi} | ${hits.join("; ")}`);
  }
}

void main();