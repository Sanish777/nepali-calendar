import { parseCells } from "../src/lib/scraper/nepcalendarscrape-scraper";

const BASE = "https://nepalicalendar.rat32.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchPage(path: string) {
  const r = await fetch(BASE + path, { headers: { "User-Agent": UA }, redirect: "follow", cache: "no-store" });
  return r.text();
}

async function main() {
  const y = Number(process.argv[2] || 2083);
  const m = Number(process.argv[3] || 6);
  const name = ["Baisakh","Jestha","Ashad","Shrawan","Bhadra","Ashwin","Kartik","Mangshir","Poush","Magh","Falgun","Chaitra"][m-1];
  const slug = ["baisakh","jestha","ashad","shrawan","bhadra","ashwin","kartik","mangsir","poush","magh","falgun","chaitra"][m-1];
  const enHtml = await fetchPage(`/${y}/${slug}`);
  const npHtml = await fetchPage(`/index_nep.php?year=${y}&month=${name}`);
  const en = parseCells(enHtml);
  const np = parseCells(npHtml);
  const days = new Set<number>([...en.map(c=>c.bsDay), ...np.map(c=>c.bsDay)]);
  for (const d of [...days].sort((a,b)=>a-b)) {
    const e = en.find(c=>c.bsDay===d);
    const n = np.find(c=>c.bsDay===d);
    const hasDeva = /[\u0900-\u097F]/.test(n?.festEn || "");
    console.log(
      `day ${String(d).padStart(2)} | EN:${(e?.festEn ?? "").padEnd(45).slice(0,45)} | NP:${(n?.festEn ?? "").padEnd(45).slice(0,45)} ${hasDeva?"(Deva)":"(LATIN)"}`
    );
  }
}

main();