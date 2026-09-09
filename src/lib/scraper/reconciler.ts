import { prisma } from "../prisma";
import { scrapePatroScrapeMonth } from "./patroscrape-scraper";
import { scrapeNepCalendarScrapeMonth } from "./nepcalendarscrape-scraper";
import { bsToAd } from "../nepcalendarscrape/converter";
import { WEEKDAYS, toDevanagari } from "../nepcalendarscrape/bs-data";
import { calculatePanchanga } from "../nepcalendarscrape/panchanga";
import { DEFAULT_CALENDAR_SOURCE, type CalendarSource } from "../settings";

export interface ReconcileOptions {
  yearBs: number;
  monthBs: number;
  source?: CalendarSource;
}

export interface ReconcileResult {
  success: boolean;
  jobId: string;
  yearBs: number;
  monthBs: number;
  daysSynced: number;
  eventsSynced: number;
  message?: string;
}

export async function syncMonthCalendar(options: ReconcileOptions): Promise<ReconcileResult> {
  const { yearBs, monthBs, source = DEFAULT_CALENDAR_SOURCE } = options;

  // Create scraper job log
  const jobLog = await prisma.scraperJobLog.create({
    data: {
      source,
      targetYear: yearBs,
      targetMonth: monthBs,
      status: "RUNNING",
    },
  });

  try {
    let daysSynced = 0;
    let eventsSynced = 0;

    const scrapedData =
      source === "NEPCALENDARSCRAPE"
        ? await scrapeNepCalendarScrapeMonth(yearBs, monthBs)
        : await scrapePatroScrapeMonth(yearBs, monthBs);

    // Load any existing admin date overrides for this month
    const overrides = await prisma.dateOverride.findMany({
      where: { bsYear: yearBs, bsMonth: monthBs },
    });
    const overrideMap = new Map<number, typeof overrides[0]>();
    for (const ov of overrides) {
      overrideMap.set(ov.bsDay, ov);
    }

    if (scrapedData && scrapedData.days.length > 0) {
      for (const day of scrapedData.days) {
        const ov = overrideMap.get(day.dayBs);

        // Verification with canonical BS to AD conversion
        const conv = bsToAd(day.yearBs, day.monthBs, day.dayBs);
        const weekday = WEEKDAYS[day.dayOfWeek] || WEEKDAYS[conv.ad.dayOfWeek];

        const isHoliday = ov?.isHolidayOverride !== null && ov?.isHolidayOverride !== undefined
          ? ov.isHolidayOverride
          : day.isHoliday || day.dayOfWeek === 6; // In Nepal Saturday (dayOfWeek=6) is weekly holiday

        const holidayReason = ov?.holidayReason
          ? ov.holidayReason
          : "events" in day && Array.isArray(day.events)
            ? (day.events.find((e) => e.isHoliday)?.titleEn || (day.dayOfWeek === 6 ? "Saturday Weekend" : undefined))
            : day.dayOfWeek === 6
              ? "Saturday Weekend"
              : undefined;

        const tithiShort = ov?.customTithiNp ? ov.customTithiNp : (day.tithiShort || "");

        const tithiNameEn =
          ov?.customTithiEn ||
          ("panchanga" in day ? day.panchanga?.tithi : undefined) ||
          ("tithiEn" in day ? day.tithiEn : undefined) ||
          undefined;

        const commonPanchanga = {
          ...("panchanga" in day && day.panchanga
            ? {
                nakshatra: day.panchanga.nakshatra,
                nakshatraIndex: day.panchanga.nakshatraIndex,
                yogaIndex: day.panchanga.yogaIndex,
                karanaIndex: day.panchanga.karanaIndex,
                paksha: day.panchanga.paksha,
                sunrise: day.panchanga.sunrise,
                sunset: day.panchanga.sunset,
                moonrise: day.panchanga.moonrise,
                moonset: day.panchanga.moonset,
              }
            : {}),
        };

        // Upsert CalendarDate
        const calendarDate = await prisma.calendarDate.upsert({
          where: {
            source_bsYear_bsMonth_bsDay: {
              source,
              bsYear: day.yearBs,
              bsMonth: day.monthBs,
              bsDay: day.dayBs,
            },
          },
          update: {
            adDate: new Date(conv.ad.isoDate),
            adYear: day.yearAd || conv.ad.year,
            adMonth: day.monthAd || conv.ad.month,
            adDay: day.dayAd || conv.ad.day,
            dayOfWeek: day.dayOfWeek,
            dayOfWeekNp: weekday.nameNp,
            dayOfWeekEn: weekday.nameEn,
            bsDayNp: day.dayBsNp || toDevanagari(day.dayBs),
            adDayNp: day.dayAdNp || toDevanagari(conv.ad.day),
            tithiShort,
            tithiNameNp: ov?.customTithiNp || tithiShort,
            tithiNameEn,
            ...commonPanchanga,
            isHoliday,
            holidayReason,
            isWeekend: day.dayOfWeek === 6,
            verificationStatus: "VERIFIED",
          },
          create: {
            source,
            bsYear: day.yearBs,
            bsMonth: day.monthBs,
            bsDay: day.dayBs,
            adDate: new Date(conv.ad.isoDate),
            adYear: day.yearAd || conv.ad.year,
            adMonth: day.monthAd || conv.ad.month,
            adDay: day.dayAd || conv.ad.day,
            dayOfWeek: day.dayOfWeek,
            dayOfWeekNp: weekday.nameNp,
            dayOfWeekEn: weekday.nameEn,
            bsDayNp: day.dayBsNp || toDevanagari(day.dayBs),
            adDayNp: day.dayAdNp || toDevanagari(conv.ad.day),
            tithiShort,
            tithiNameNp: ov?.customTithiNp || tithiShort,
            tithiNameEn,
            ...commonPanchanga,
            isHoliday,
            holidayReason,
            isWeekend: day.dayOfWeek === 6,
            verificationStatus: "VERIFIED",
          },
        });

        daysSynced++;

        // Upsert events
        if ("events" in day && Array.isArray(day.events)) {
          for (const ev of day.events) {
            if (!ev.titleNp && !ev.titleEn) continue;

            // Match by English title (older scrapes stored the Latin title in titleNp
            // too), then heal the Nepali title in place instead of creating duplicates.
            // All matches are healed, not just the first: duplicate rows left by
            // older scrapers can otherwise hide a dirty Latin twin behind a clean one.
            const candidates = await prisma.calendarEvent.findMany({
              where: {
                source,
                bsYear: day.yearBs,
                bsMonth: day.monthBs,
                bsDay: day.dayBs,
                ...(ev.titleEn ? { titleEn: ev.titleEn } : { titleNp: ev.titleNp }),
              },
              orderBy: { id: "asc" },
            });

            let calEvent = candidates.length
              ? candidates.find((c) => /[ऀ-ॿ]/.test(c.titleNp)) ?? candidates[0]
              : null;

            if (!calEvent) {
              calEvent = await prisma.calendarEvent.create({
                data: {
                  titleNp: ev.titleNp,
                  titleEn: ev.titleEn || ev.titleNp,
                  eventType: ev.isHoliday ? "HOLIDAY" : "FESTIVAL",
                  isPublicHoliday: ev.isHoliday,
                  recurrence: "ONE_OFF",
                  bsYear: day.yearBs,
                  bsMonth: day.monthBs,
                  bsDay: day.dayBs,
                  source,
                  status: "PUBLISHED",
                  ...("imageUrl" in ev && ev.imageUrl ? { imageUrl: ev.imageUrl } : {}),
                  ...("articleUrlEn" in ev && (ev.articleUrlEn || ev.articleUrlNp)
                    ? { articleUrl: ev.articleUrlEn || ev.articleUrlNp }
                    : {}),
                },
              });
              eventsSynced++;
            } else {
              // Heal any match whose Nepali title is missing or still Latin,
              // but never downgrade a Devanagari title back to transliteration.
              const staleIds = candidates
                .filter((c) => c.titleNp !== ev.titleNp && !/[ऀ-ॿ]/.test(c.titleNp))
                .map((c) => c.id);
              if (staleIds.length && /[ऀ-ॿ]/.test(ev.titleNp)) {
                await prisma.calendarEvent.updateMany({
                  where: { id: { in: staleIds } },
                  data: { titleNp: ev.titleNp },
                });
              }
            }

            // Dedupe exact-copy leftovers so a day never carries twin rows.
            const fresh = await prisma.calendarEvent.findMany({
              where: {
                source,
                bsYear: day.yearBs,
                bsMonth: day.monthBs,
                bsDay: day.dayBs,
                ...(calEvent!.titleEn ? { titleEn: calEvent!.titleEn } : { titleNp: calEvent!.titleNp }),
              },
              orderBy: { id: "asc" },
            });
            const dupIds = fresh
              .filter(
                (c) => c.id !== calEvent!.id && c.titleEn === calEvent!.titleEn && c.titleNp === calEvent!.titleNp
              )
              .map((c) => c.id);
            if (dupIds.length) {
              await prisma.calendarEvent.deleteMany({ where: { id: { in: dupIds } } });
            }

            // Link to CalendarDate
            await prisma.calendarEventDate.upsert({
              where: {
                dateId_eventId: {
                  dateId: calendarDate.id,
                  eventId: calEvent.id,
                },
              },
              update: {},
              create: {
                dateId: calendarDate.id,
                eventId: calEvent.id,
              },
            });
          }
        }
      }
    } else {
      // Fallback algorithm generation if live scraping is temporarily unreachable
      const convStart = bsToAd(yearBs, monthBs, 1);
      const totalDays = 31; // fallback
      for (let d = 1; d <= totalDays; d++) {
        const conv = bsToAd(yearBs, monthBs, d);
        const adDate = new Date(conv.ad.isoDate);
        const pan = calculatePanchanga(adDate);
        const weekday = WEEKDAYS[conv.ad.dayOfWeek];

        await prisma.calendarDate.upsert({
          where: {
            source_bsYear_bsMonth_bsDay: {
              source,
              bsYear: yearBs,
              bsMonth: monthBs,
              bsDay: d,
            },
          },
          update: {},
          create: {
            source,
            bsYear: yearBs,
            bsMonth: monthBs,
            bsDay: d,
            adDate,
            adYear: conv.ad.year,
            adMonth: conv.ad.month,
            adDay: conv.ad.day,
            dayOfWeek: conv.ad.dayOfWeek,
            dayOfWeekNp: weekday.nameNp,
            dayOfWeekEn: weekday.nameEn,
            bsDayNp: toDevanagari(d),
            adDayNp: toDevanagari(conv.ad.day),
            tithiShort: pan.tithi.nameNp.split(" ")[0],
            tithiNameNp: pan.tithi.nameNp,
            tithiNameEn: pan.tithi.nameEn,
            nakshatra: pan.nakshatra.nameNp,
            nakshatraIndex: pan.nakshatra.index,
            yogaIndex: pan.yoga.index,
            karanaIndex: pan.karana.index,
            paksha: pan.tithi.paksha,
            sunrise: pan.astronomy.sunrise,
            sunset: pan.astronomy.sunset,
            isHoliday: conv.ad.dayOfWeek === 6,
            isWeekend: conv.ad.dayOfWeek === 6,
            verificationStatus: "VERIFIED",
          },
        });
        daysSynced++;
      }
    }

    await prisma.scraperJobLog.update({
      where: { id: jobLog.id },
      data: {
        status: "SUCCESS",
        itemsSynced: daysSynced + eventsSynced,
        completedAt: new Date(),
      },
    });

    return {
      success: true,
      jobId: jobLog.id,
      yearBs,
      monthBs,
      daysSynced,
      eventsSynced,
      message: `Successfully synchronized ${daysSynced} dates and ${eventsSynced} events for BS ${yearBs}-${monthBs} [${source}]`,
    };
  } catch (error: unknown) {
    await prisma.scraperJobLog.update({
      where: { id: jobLog.id },
      data: {
        status: "FAILED",
        errorDetails: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      },
    });

    throw error;
  }
}