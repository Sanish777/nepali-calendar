import { parseCells } from "../src/lib/scraper/nepcalendarscrape-scraper";

const BASE = "https://nepalicalendar.rat32.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const SLUGS = ["baisakh","jestha","ashad","shrawan","bhadra","ashwin","kartik","mangsir","poush","magh","falgun","chaitra"];
const NAMES = ["Baisakh","Jestha","Ashad","Shrawan","Bhadra","Ashwin","Kartik","Mangshir","Poush","Magh","Falgun","Chaitra"];

async function fetchPage(path: string) {
  const r = await fetch(BASE + path, { headers: { "User-Agent": UA }, redirect: "follow", cache: "no-store" });
  return r.text();
}
function canonical(tithi: string) {
  const map: Record<string, string> = {
    pratipada: "प्रतिपदा", dwitiya: "द्वितीया", tritiya: "तृतीया", chaturthi: "चतुर्थी",
    panchami: "पञ्चमी", sasthi: "षष्ठी", shasthi: "षष्ठी", saptami: "सप्तमी",
    aastami: "अष्टमी", ashtami: "अष्टमी", nawami: "नवमी", navami: "नवमी",
    dashami: "दशमी", ekadashi: "एकादशी", dwadashi: "द्वादशी", trayodashi: "त्रयोदशी",
    chaturdashi: "चतुर्दशी", purnima: "पूर्णिमा", amavasya: "औंसी", aunsi: "औंसी",
  };
  const w = tithi.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") || "";
  return map[w] || tithi.trim();
}
function fp(cells: { bsDay: number; tithiEn: string }[]) {
  const m = new Map<number, string>();
  for (const c of cells) { const t = canonical(c.tithiEn); if (t && t.length >= 2) m.set(c.bsDay, t); }
  return m;
}
function match(a: Map<number, string>, b: Map<number, string>) {
  let total = 0, matched = 0;
  for (const [d, t] of a) { total++; if (b.get(d) === t) matched++; }
  return { total, matched, ratio: total ? matched / total : 0 };
}

async function main() {
  const y = Number(process.argv[2] || 2083);
  const enFps: Map<number,string>[] = [];
  for (let m = 1; m <= 12; m++) {
    const html = await fetchPage(`/${y}/${SLUGS[m-1]}`);
    enFps[m-1] = fp(parseCells(html));
  }
  console.log("WRONG-month cross-scores (EN vs EN, same year):");
  for (let a = 0; a < 12; a++) {
    for (let b = 0; b < 12; b++) {
      if (a === b) continue;
      const r = match(enFps[a], enFps[b]);
      if (r.total >= 20 && r.ratio >= 0.3) {
        console.log(`EN ${SLUGS[a].padEnd(8)} vs EN ${SLUGS[b].padEnd(8)}: ${r.matched}/${r.total} = ${r.ratio.toFixed(2)}`);
      }
    }
  }
  console.log("\nSAME-month self-iags (should be ~1.0):");
  for (let a = 0; a < 12; a++) {
    const r = match(enFps[a], enFps[a]);
    console.log(`EN ${SLUGS[a].padEnd(8)} self: ${r.matched}/${r.total}`);
  }
}
main();