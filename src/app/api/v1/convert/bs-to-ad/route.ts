import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiUsage, withRateLimitHeaders } from "@/lib/auth/api-key";
import { bsToAd } from "@/lib/nepcalendarscrape/converter";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { auth, errorResponse } = await authenticateApiKey(req);
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const bsYear = parseInt(url.searchParams.get("bs_year") || url.searchParams.get("year") || "", 10);
  const bsMonth = parseInt(url.searchParams.get("bs_month") || url.searchParams.get("month") || "", 10);
  const bsDay = parseInt(url.searchParams.get("bs_day") || url.searchParams.get("day") || "", 10);

  if (isNaN(bsYear) || isNaN(bsMonth) || isNaN(bsDay)) {
    return withRateLimitHeaders(
      NextResponse.json(
        {
          success: false,
          error: "ValidationError",
          message: "Query parameters 'bs_year', 'bs_month', and 'bs_day' are required integers. (e.g. ?bs_year=2083&bs_month=5&bs_day=20)",
        },
        { status: 400 }
      ),
      auth?.rateLimit
    );
  }

  try {
    const result = bsToAd(bsYear, bsMonth, bsDay);
    const duration = Date.now() - startTime;

    if (auth) {
      logApiUsage(
        auth.apiKey.id,
        "/api/v1/convert/bs-to-ad",
        "GET",
        200,
        duration,
        req.headers.get("x-forwarded-for") || undefined,
        req.headers.get("user-agent") || undefined
      );
    }

    return withRateLimitHeaders(
      NextResponse.json({
        success: true,
        data: result,
      }),
      auth?.rateLimit
    );
  } catch (err: any) {
    return withRateLimitHeaders(
      NextResponse.json(
        {
          success: false,
          error: "InvalidDateRange",
          message: err.message || "Failed to convert BS to AD date.",
        },
        { status: 400 }
      ),
      auth?.rateLimit
    );
  }
}
