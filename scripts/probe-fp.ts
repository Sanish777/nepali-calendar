import { parseCells, discoverMonthParamSpellings } from "../src/lib/scraper/nepcalendarscrape-scraper";
import { getMonthSpelling, loadLearnedYears } from "../src/lib/nepcalendarscrape/bs-registry";

const BASE = "https://nepalicalendar.rat32.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

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

function fingerprint(cells: { bsDay: number; tithiEn: string }[]) {
  const m = new Map<number, string>();
  for (const c of cells) {
    const t = canonical(c.tithiEn);
    if (t && t.length >= 2) m.set(c.bsDay, t);
  }
  return m;
}

function match(en: Map<number, string>, np: Map<number, string>) {
  let total = 0, matched = 0;
  for (const [d, t] of en) { total++; if (np.get(d) === t) matched++; }
  return { total, matched, ratio: total ? matched / total : 0 };
}

async function main() {
  await loadLearnedYears();
  const y = Number(process.argv[2] || 2083);
  const m = Number(process.argv[3] || 8);
  console.log("EN slug:", `/${y}/${["baisakh","jestha","ashad","shrawan","bhadra","ashwin","kartik","mangsir","poush","magh","falgun","chaitra"][m-1]}`);
  const enHtml = await fetchPage(`/${y}/${["baisakh","jestha","ashad","shrawan","bhadra","ashwin","kartik","mangsir","poush","magh","falgun","chaitra"][m-1]}`);
  const enCells = parseCells(enHtml);
  const enFp = fingerprint(enCells);
  const enMax = enCells.reduce((a, b) => Math.max(a, b.bsDay), 0);
  console.log(`EN cells: ${enCells.length}, max day: ${enMax}, first tithi day1: ${enCells.find(c=>c.bsDay===1)?.tithiEn}`);

  const discovered = discoverMonthParamSpellings(enHtml);
  console.log("discovered from EN page:", discovered);

  const candidates = [`${getMonthSpelling(m)}`, ...discovered];
  for (const name of [...new Set(candidates)]) {
    try {
      const npHtml = await fetchPage(`/index_nep.php?year=${y}&month=${encodeURIComponent(name)}`);
      const npCells = parseCells(npHtml);
      const npMax = npCells.reduce((a, b) => Math.max(a, b.bsDay), 0);
      const nm = match(enFp, fingerprint(npCells));
      console.log(`candidate "${name}" -> cells ${npCells.length} max ${npMax} day1fest ${npCells.find(c=>c.bsDay===1)?.festEn ?? "(none)"} day1tithi ${npCells.find(c=>c.bsDay===1)?.tithiEn} | fp ${JSON.stringify(nm)}`);
    } catch (e) {
      console.log(`candidate "${name}" -> ERROR ${(e as Error).message}`);
    }
  }
}

main();