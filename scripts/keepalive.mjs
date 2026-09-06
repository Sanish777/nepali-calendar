// Keeps the Neon compute awake during local dev so the first page hit after
// idle doesn't pay a 10-30s scale-to-zero cold start (free plan).
// Usage: npm run dev:keepalive   (or: node scripts/keepalive.mjs)
const BASE = process.env.KEEPALIVE_BASE || "http://localhost:3000";
const API_KEY = "np_live_demo1234567890abcdef12345678";
const INTERVAL_MS = Number(process.env.KEEPALIVE_INTERVAL_MS || 90) * 1000;

const urls = [
  `/api/v1/calendar/today?api_key=${API_KEY}`,
  `/api/v1/calendar/month?year=2083&month=5&api_key=${API_KEY}`,
];

async function ping() {
  for (const url of urls) {
    try {
      const res = await fetch(BASE + url);
      console.log(`${new Date().toISOString()} ${res.status} ${url.split("?")[0]}`);
    } catch (err) {
      console.log(`${new Date().toISOString()} ERR ${url.split("?")[0]} (${err.message})`);
    }
  }
}

console.log(`Keepalive every ${INTERVAL_MS / 1000}s -> ${BASE}`);
await ping();
setInterval(ping, INTERVAL_MS);