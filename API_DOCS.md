# Miti API Documentation

Welcome to the Miti API. This API provides comprehensive endpoints for Nepali Calendar (Bikram Sambat) data, dates, events, and conversions.

## Authentication

All API endpoints require authentication via an API Key. You can provide the API key in one of two ways:
1. **Header:** `Authorization: Bearer YOUR_API_KEY`
2. **Query Parameter:** `?api_key=YOUR_API_KEY`

## Base URL
`https://api.miti.dev` (or your local environment)

---

## Endpoints

### 1. Get Today's Date
`GET /api/v1/calendar/today`
Returns the current date in both BS and AD formats, including tithi and event information.

### 2. Get Specific Date
`GET /api/v1/calendar/date?bs_year=2083&bs_month=5&bs_day=17`
Fetch detailed information for a specific Bikram Sambat date.

### 3. Get Monthly Calendar
`GET /api/v1/calendar/month?year=2083&month=5`
Returns an entire month's calendar, including padding days and start day of the week.

### 4. Convert BS to AD
`GET /api/v1/convert/bs-to-ad?year=2083&month=5&day=17`
Convert a Nepali date to a Gregorian date.

### 5. Convert AD to BS
`GET /api/v1/convert/ad-to-bs?year=2026&month=9&day=2`
Convert a Gregorian date to a Nepali date.

### 6. Get Events
`GET /api/v1/events?year=2083&month=5`
Returns a list of all festivals, public holidays, and events for a specific month.

---

## Rate Limits
Rate limits are enforced based on the custom quotas assigned to your API token by the Administrator. 

Standard response headers are returned on every call:
- `X-RateLimit-Limit`: Requests allowed per minute
- `X-RateLimit-Remaining`: Requests remaining in the current minute
- `X-RateLimit-Reset`: Timestamp when the minute window resets
- `X-Monthly-Limit`: Total monthly quota allocated to your API token
- `X-Monthly-Remaining`: Requests remaining for the current month

If you exceed your limits, the API will respond with HTTP `429 Too Many Requests`.
