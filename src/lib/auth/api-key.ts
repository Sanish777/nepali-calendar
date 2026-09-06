import { prisma } from "../prisma";
import crypto from "crypto";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  error?: string;
  statusCode?: number;
}

export interface ApiAuthContext {
  apiKey: {
    id: string;
    key: string;
    name: string;
    userId: string;
    rateLimitPerMinute: number | null;
    monthlyLimit: number | null;
    totalUsage: number;
    monthlyUsage: number;
  };
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationName: string | null;
  };
  subscription?: {
    planCode: string;
    planName: string;
    customRpm: number | null;
    customMonthlyLimit: number | null;
    requestsPerMinute: number;
    monthlyRequestLimit: number;
  };
  rateLimit: RateLimitResult;
}

// In-memory sliding window rate tracker for ultra-fast per-minute rate limits
// Map of `apiKeyId` -> array of timestamps (ms)
const rateTracker = new Map<string, number[]>();

export function generateApiKey(isTest = false): { fullKey: string; keyPrefix: string } {
  const prefix = isTest ? "np_test_" : "np_live_";
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const fullKey = `${prefix}${randomBytes}`;
  const keyPrefix = `${prefix}${randomBytes.slice(0, 8)}...`;
  return { fullKey, keyPrefix };
}

/**
 * Validate API Key from header or query param and enforce admin-customized rate limits
 */
export async function authenticateApiKey(
  req: Request
): Promise<{ auth?: ApiAuthContext; errorResponse?: Response }> {
  // Extract API key from headers or search params
  // Header: X-API-Key or Authorization: Bearer <key>
  const url = new URL(req.url);
  let key = req.headers.get("x-api-key") || req.headers.get("x-api-token");

  if (!key) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer np_")) {
      key = authHeader.slice(7).trim();
    }
  }

  if (!key) {
    key = url.searchParams.get("api_key") || url.searchParams.get("apiKey");
  }

  if (!key) {
    return {
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized",
          message: "API key is missing. Provide 'X-API-Key' header or '?api_key=' parameter.",
          documentation_url: "/docs",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }

  // Find API key in database
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { key: key.trim() },
    include: {
      user: {
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      },
    },
  });

  if (!apiKeyRecord) {
    return {
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: "InvalidApiKey",
          message: "The provided API key is invalid or does not exist.",
          documentation_url: "/docs",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }

  if (!apiKeyRecord.isActive) {
    return {
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: "ApiKeyDisabled",
          message: "This API key has been revoked or deactivated.",
          documentation_url: "/",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }

  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    return {
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: "ApiKeyExpired",
          message: "This API key has expired.",
          documentation_url: "/",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }

  const user = apiKeyRecord.user;
  const sub = user.subscription;
  const plan = sub?.plan;

  // Determine effective Rate Limit Per Minute (RPM)
  // Priority: 1) API Key override -> 2) Subscription Custom RPM -> 3) Plan default RPM -> 4) Default 60
  const effectiveRpm =
    apiKeyRecord.rateLimitPerMinute ??
    sub?.customRpm ??
    plan?.requestsPerMinute ??
    60;

  // Determine effective Monthly Request Limit
  // Priority: 1) API Key override -> 2) Subscription Custom Monthly Limit -> 3) Plan default -> 4) Default 1000
  const effectiveMonthlyLimit =
    apiKeyRecord.monthlyLimit ??
    sub?.customMonthlyLimit ??
    plan?.monthlyRequestLimit ??
    1000;

  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const windowStart = now - windowMs;

  // Check sliding window rate limit
  const timestamps = (rateTracker.get(apiKeyRecord.id) || []).filter((t) => t > windowStart);

  const resetSeconds = Math.ceil((windowStart + windowMs - now) / 1000) || 1;

  // Check if monthly limit exceeded
  if (apiKeyRecord.monthlyUsage >= effectiveMonthlyLimit) {
    return {
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: "MonthlyQuotaExceeded",
          message: `Monthly API request quota (${effectiveMonthlyLimit.toLocaleString()}) exceeded. Please upgrade your subscription plan.`,
          current_usage: apiKeyRecord.monthlyUsage,
          monthly_limit: effectiveMonthlyLimit,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(effectiveRpm),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(resetSeconds),
            "X-RateLimit-Monthly-Limit": String(effectiveMonthlyLimit),
            "X-RateLimit-Monthly-Remaining": "0",
          },
        }
      ),
    };
  }

  // Check per-minute rate limit
  if (timestamps.length >= effectiveRpm) {
    return {
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: "RateLimitExceeded",
          message: `Too many requests. Allowed rate is ${effectiveRpm} requests per minute.`,
          retry_after_seconds: resetSeconds,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(resetSeconds),
            "X-RateLimit-Limit": String(effectiveRpm),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(resetSeconds),
            "X-RateLimit-Monthly-Limit": String(effectiveMonthlyLimit),
            "X-RateLimit-Monthly-Remaining": String(
              Math.max(0, effectiveMonthlyLimit - apiKeyRecord.monthlyUsage)
            ),
          },
        }
      ),
    };
  }

  // Record this hit
  timestamps.push(now);
  rateTracker.set(apiKeyRecord.id, timestamps);

  const remainingInWindow = Math.max(0, effectiveRpm - timestamps.length);
  const monthlyRemaining = Math.max(0, effectiveMonthlyLimit - (apiKeyRecord.monthlyUsage + 1));

  // Asynchronously increment usage in database
  prisma.apiKey
    .update({
      where: { id: apiKeyRecord.id },
      data: {
        totalUsage: { increment: 1 },
        monthlyUsage: { increment: 1 },
        lastUsedAt: new Date(),
      },
    })
    .catch(() => {});

  const authContext: ApiAuthContext = {
    apiKey: {
      id: apiKeyRecord.id,
      key: apiKeyRecord.key,
      name: apiKeyRecord.name,
      userId: apiKeyRecord.userId,
      rateLimitPerMinute: apiKeyRecord.rateLimitPerMinute,
      monthlyLimit: apiKeyRecord.monthlyLimit,
      totalUsage: apiKeyRecord.totalUsage + 1,
      monthlyUsage: apiKeyRecord.monthlyUsage + 1,
    },
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationName: user.organizationName,
    },
    subscription: plan
      ? {
          planCode: plan.code,
          planName: plan.name,
          customRpm: sub?.customRpm ?? null,
          customMonthlyLimit: sub?.customMonthlyLimit ?? null,
          requestsPerMinute: effectiveRpm,
          monthlyRequestLimit: effectiveMonthlyLimit,
        }
      : undefined,
    rateLimit: {
      allowed: true,
      limit: effectiveRpm,
      remaining: remainingInWindow,
      reset: resetSeconds,
      monthlyLimit: effectiveMonthlyLimit,
      monthlyRemaining,
    },
  };

  return { auth: authContext };
}

/**
 * Log API request execution
 */
export async function logApiUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await prisma.apiUsageLog.create({
      data: {
        apiKeyId,
        endpoint,
        method,
        statusCode,
        responseTimeMs,
        // Bound stored sizes — full user agents can reach several KB
        ipAddress: ipAddress ? ipAddress.slice(0, 45) : undefined,
        userAgent: userAgent ? userAgent.slice(0, 255) : undefined,
      },
    });
  } catch (err) {
    // Non-blocking error
    console.error("Failed to log API usage:", err);
  }
}

/**
 * Append rate limit headers to a Response
 */
export function withRateLimitHeaders(
  res: Response,
  rateLimit?: RateLimitResult
): Response {
  if (!rateLimit) return res;

  const headers = new Headers(res.headers);
  headers.set("X-RateLimit-Limit", String(rateLimit.limit));
  headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
  headers.set("X-RateLimit-Reset", String(rateLimit.reset));
  headers.set("X-RateLimit-Monthly-Limit", String(rateLimit.monthlyLimit));
  headers.set("X-RateLimit-Monthly-Remaining", String(rateLimit.monthlyRemaining));

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}
