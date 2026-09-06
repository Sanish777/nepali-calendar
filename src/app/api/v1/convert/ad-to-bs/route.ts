import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiUsage, withRateLimitHeaders } from "@/lib/auth/api-key";
import { adToBs } from "@/lib/nepcalendarscrape/converter";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { auth, errorResponse } = await authenticateApiKey(req);
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  let adYear: number;
  let adMonth: number;
  let adDay: number;

  const dateParam = url.searchParams.get("date") || url.searchParams.get("ad_date");
  if (dateParam) {
    const parts = dateParam.split("-").map(Number);
    adYear = parts[0];
    adMonth = parts[1];
    adDay = parts[2];
  } else {
    adYear = parseInt(url.searchParams.get("ad_year") || url.searchParams.get("year") || "", 10);
    adMonth = parseInt(url.searchParams.get("ad_month") || url.searchParams.get("month") || "", 10);
    adDay = parseInt(url.searchParams.get("ad_day") || url.searchParams.get("day") || "", 10);
  }

  if (isNaN(adYear) || isNaN(adMonth) || isNaN(adDay)) {
    return withRateLimitHeaders(
      NextResponse.json(
        {
          success: false,
          error: "ValidationError",
          message: "Query parameters 'ad_year', 'ad_month', and 'ad_day' (or 'date=YYYY-MM-DD') are required.",
        },
        { status: 400 }
      ),
      auth?.rateLimit
    );
  }

  try {
    const result = adToBs(adYear, adMonth, adDay);
    const duration = Date.now() - startTime;

    if (auth) {
      logApiUsage(
        auth.apiKey.id,
        "/api/v1/convert/ad-to-bs",
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
          error: "InvalidDate",
          message: err.message || "Failed to convert AD to BS date.",
        },
        { status: 400 }
      ),
      auth?.rateLimit
    );
  }
}
