import { parseCells } from "../src/lib/scraper/nepcalendarscrape-scraper";
import { loadLearnedYears } from "../src/lib/nepcalendarscrape/bs-registry";

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
  return { total, matched, ratio: total ? +((matched / total).toFixed(2)) : 0 };
}

async function main() {
  await loadLearnedYears();
  const y = Number(process.argv[2] || 2083);
  const enFps: Map<number,string>[] = [];
  const enDay1: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const html = await fetchPage(`/${y}/${SLUGS[m-1]}`);
    const cells = parseCells(html);
    enFps[m-1] = fp(cells);
    enDay1[m-1] = cells.find(c=>c.bsDay===1)?.tithiEn ?? "?";
    console.log(`EN ${y} ${SLUGS[m-1].padEnd(8)} cells=${String(cells.length).padEnd(2)} max=${cells.reduce((a,b)=>Math.max(a,b.bsDay),0)} day1=${enDay1[m-1]}`);
  }
  console.log("\nNP param -> which EN month matches (tithi fingerprint):");
  for (let m = 1; m <= 12; m++) {
    try {
      const html = await fetchPage(`/index_nep.php?year=${y}&month=${NAMES[m-1]}`);
      const cells = parseCells(html);
      const npMax = cells.reduce((a,b)=>Math.max(a,b.bsDay),0);
      const npFp = fp(cells);
      let best = "NONE", bestR = 0;
      enFps.forEach((ef, i) => {
        const r = match(ef, npFp);
        if (r.total >= 20 && r.ratio > bestR) { bestR = r.ratio; best = SLUGS[i]; }
      });
      console.log(`param=${NAMES[m-1].padEnd(9)} serves cells=${String(cells.length).padEnd(2)} max=${numpad(npMax)} day1fest=${(cells.find(c=>c.bsDay===1)?.festEn ?? "(none)").slice(0,40)} -> matches EN month: ${best} (r=${bestR})`);
    } catch (e) {
      console.log(`param=${NAMES[m-1]} ERROR ${(e as Error).message}`);
    }
  }
}

function numpad(n: number) { return String(n).padEnd(2); }
main();