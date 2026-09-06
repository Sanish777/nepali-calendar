/**
 * Server bootstrap: hydrate learned BS calendar data (month lengths and month=
 * spellings harvested from upstream calendars, stored in ScraperCalendarMeta)
 * so new BS years work across restarts without code changes.
 */
export async function register() {
  const { loadLearnedYears } = await import("./lib/nepcalendarscrape/bs-registry");
  try {
    await loadLearnedYears();
  } catch (err) {
    console.error("[instrumentation] failed to load learned BS years:", (err as Error).message);
  }
}