import { prisma } from "./prisma";

export const CALENDAR_SOURCES = {
  HAMROPATRO: "HAMROPATRO",
  NEPALICALENDAR: "NEPALICALENDAR",
} as const;

export type CalendarSource = keyof typeof CALENDAR_SOURCES;

export const DEFAULT_CALENDAR_SOURCE: CalendarSource = "HAMROPATRO";

const SOURCE_KEY = "defaultCalendarSource";

const cache: { value: CalendarSource | null; expiresAt: number } = {
  value: null,
  expiresAt: 0,
};

const CACHE_TTL_MS = 30 * 1000;

export async function getActiveCalendarSource(): Promise<CalendarSource> {
  if (cache.value && Date.now() < cache.expiresAt) {
    return cache.value;
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SOURCE_KEY },
    });

    const value =
      setting && setting.value in CALENDAR_SOURCES
        ? (setting.value as CalendarSource)
        : DEFAULT_CALENDAR_SOURCE;

    cache.value = value;
    cache.expiresAt = Date.now() + CACHE_TTL_MS;
    return value;
  } catch {
    return DEFAULT_CALENDAR_SOURCE;
  }
}

export async function setActiveCalendarSource(source: string): Promise<CalendarSource> {
  const normalized = source in CALENDAR_SOURCES ? (source as CalendarSource) : DEFAULT_CALENDAR_SOURCE;

  await prisma.systemSetting.upsert({
    where: { key: SOURCE_KEY },
    update: { value: normalized },
    create: { key: SOURCE_KEY, value: normalized },
  });

  cache.value = normalized;
  cache.expiresAt = Date.now() + CACHE_TTL_MS;
  return normalized;
}