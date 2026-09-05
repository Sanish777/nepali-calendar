import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const baseUrl = url.origin;

  const openApiSpec = {
    openapi: "3.0.3",
    info: {
      title: "Miti API",
      version: "1.0.0",
      description:
        "High-performance commercial REST API for Bikram Sambat (BS) and Anno Domini (AD) calendar operations, accurate date conversions (BS 2000 - 2090), tithi, panchang, festivals, public holidays, and embeddable widgets.",
      contact: {
        name: "Miti API Support",
        email: "support@miti.dev",
        url: baseUrl,
      },
    },
    servers: [
      {
        url: baseUrl,
        description: "Current Server Host",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "Developer API Key format: np_live_... or np_test_...",
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      "/api/v1/convert/bs-to-ad": {
        get: {
          summary: "Convert BS Date to AD",
          description: "Converts Bikram Sambat date (Year, Month, Day) to Gregorian Anno Domini date.",
          parameters: [
            { name: "bs_year", in: "query", required: true, schema: { type: "integer", example: 2083 } },
            { name: "bs_month", in: "query", required: true, schema: { type: "integer", minimum: 1, maximum: 12, example: 5 } },
            { name: "bs_day", in: "query", required: true, schema: { type: "integer", minimum: 1, maximum: 32, example: 20 } },
          ],
          responses: {
            200: { description: "Verified date conversion result" },
            400: { description: "Invalid date or out of bounds" },
            401: { description: "Missing or invalid API key" },
            429: { description: "Rate limit or monthly quota exceeded" },
          },
        },
      },
      "/api/v1/convert/ad-to-bs": {
        get: {
          summary: "Convert AD Date to BS",
          description: "Converts Gregorian Anno Domini date (Year, Month, Day or YYYY-MM-DD) to Bikram Sambat date.",
          parameters: [
            { name: "ad_year", in: "query", schema: { type: "integer", example: 2026 } },
            { name: "ad_month", in: "query", schema: { type: "integer", minimum: 1, maximum: 12, example: 9 } },
            { name: "ad_day", in: "query", schema: { type: "integer", minimum: 1, maximum: 31, example: 5 } },
            { name: "date", in: "query", schema: { type: "string", example: "2026-09-05" } },
          ],
          responses: {
            200: { description: "Verified date conversion result" },
            400: { description: "Invalid date" },
          },
        },
      },
      "/api/v1/calendar/today": {
        get: {
          summary: "Get Today's Nepali Date & Events",
          description: "Returns today's date in BS and AD with tithi, panchanga, festivals, and public holiday status.",
          responses: { 200: { description: "Today's calendar payload" } },
        },
      },
      "/api/v1/calendar/date": {
        get: {
          summary: "Get Day Details",
          description: "Retrieve comprehensive details for any specific BS or AD date including events and sunrise/sunset times.",
          parameters: [
            { name: "bs_year", in: "query", schema: { type: "integer", example: 2083 } },
            { name: "bs_month", in: "query", schema: { type: "integer", example: 5 } },
            { name: "bs_day", in: "query", schema: { type: "integer", example: 20 } },
            { name: "ad_date", in: "query", schema: { type: "string", example: "2026-09-05" } },
          ],
          responses: { 200: { description: "Detailed day payload" } },
        },
      },
      "/api/v1/calendar/month": {
        get: {
          summary: "Get Monthly Calendar Grid",
          description: "Retrieve monthly calendar grid containing all days, tithis, festivals, and weekend headers.",
          parameters: [
            { name: "bs_year", in: "query", required: true, schema: { type: "integer", example: 2083 } },
            { name: "bs_month", in: "query", required: true, schema: { type: "integer", minimum: 1, maximum: 12, example: 5 } },
          ],
          responses: { 200: { description: "Complete month grid with events" } },
        },
      },
      "/api/v1/calendar/year": {
        get: {
          summary: "Get Yearly Calendar Overview",
          description: "Retrieve 12 months summary, days count, and all major public holidays and festivals for a BS year.",
          parameters: [
            { name: "bs_year", in: "query", required: true, schema: { type: "integer", example: 2083 } },
          ],
          responses: { 200: { description: "Yearly overview and holidays list" } },
        },
      },
      "/api/v1/events": {
        get: {
          summary: "Search & Filter Festivals and Holidays",
          description: "Search Nepali festivals, national holidays, and observances by year, month, or keyword.",
          parameters: [
            { name: "bs_year", in: "query", schema: { type: "integer" } },
            { name: "bs_month", in: "query", schema: { type: "integer" } },
            { name: "holiday_only", in: "query", schema: { type: "boolean", example: true } },
            { name: "search", in: "query", schema: { type: "string", example: "Dashain" } },
          ],
          responses: { 200: { description: "Filtered events list" } },
        },
      },
      "/api/v1/panchanga": {
        get: {
          summary: "Astrological Panchanga API",
          description: "Returns Tithi, Nakshatra, Yoga, Karana, Rashi, and Kathmandu sunrise/sunset astronomical times.",
          parameters: [
            { name: "bs_year", in: "query", schema: { type: "integer", example: 2083 } },
            { name: "bs_month", in: "query", schema: { type: "integer", example: 5 } },
            { name: "bs_day", in: "query", schema: { type: "integer", example: 20 } },
          ],
          responses: { 200: { description: "Full panchanga payload" } },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}
