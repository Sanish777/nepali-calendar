# Nepali Calendar & Patro API Platform (नेपाली पात्रो एपीआई)

A production-grade, commercial **Nepali Calendar API** and developer platform built with **Next.js 16 (App Router)**, **PostgreSQL 16**, **Prisma ORM**, and **Tailwind CSS**.

The platform provides verified Bikram Sambat (वि.सं.) and Anno Domini (AD) conversions, astronomical Panchanga (Tithi, Nakshatra, Yoga, Karana, Paksha, Sunrise/Sunset for Nepal), national public holidays, festivals, and embeddable calendar widgets.

---

## 🌟 Key Features

1. **Commercial Nepali Calendar API (v1)**:
   - Verified sub-millisecond BS ↔ AD date conversions (supporting BS 2000 to BS 2090+).
   - Real-time `today` payload with Devanagari numerals, Tithi, Paksha, and today's festivals.
   - Monthly calendar grids with weekday alignment and holiday flags.
   - Astrological Panchanga feeds with Kathmandu astronomical calculations (Sunrise, Sunset, Moonrise, Moonset).
   - Searchable official holidays and festivals database.
   - Embeddable standalone JavaScript calendar widget snippet.

2. **API Authentication & Admin-Customized Rate Limiting**:
   - Developer authentication via `X-API-Key: np_live_...` or Bearer tokens.
   - **Admin-customized rate limits**:
     - Subscription-based rate limits (Free: 60 RPM, Starter: 300 RPM, Pro: 1,200 RPM, Enterprise: 5,000 RPM).
     - **Granular overrides**: Admin can set custom requests-per-minute (RPM) and monthly request quotas per user or API key.
   - Automatic usage audit logging (`ApiUsageLog`) with latency tracking and remaining quota calculation.
   - Standard response headers:
     - `X-RateLimit-Limit`
     - `X-RateLimit-Remaining`
     - `X-RateLimit-Reset`
     - `X-RateLimit-Monthly-Limit`
     - `X-RateLimit-Monthly-Remaining`

3. **Hamro Patro Web Scraper & Reconciler**:
   - Automated scraper engine extracting server-rendered month payloads, tithis, and festival items from `https://www.hamropatro.com/en`.
   - Reconciler that deduplicates, validates against canonical astronomical equations, merges festival descriptions, and handles date overrides.
   - On-demand admin trigger + automated background cron sync endpoint (`/api/cron/sync`).

4. **Interactive API Documentation Portal (`/docs`)**:
   - Interactive live sandbox playground: test any endpoint right in the browser.
   - Multi-language code snippets for **cURL**, **Node / TypeScript**, and **Python**.
   - Downloadable OpenAPI 3.0 specification (`/api/v1/openapi.json`).

5. **Developer Dashboard (`/dashboard`)**:
   - Visual Nepali Monthly Calendar with Devanagari numerals, English dates, Tithi badges, and festival tags.
   - Interactive day detail modal with complete Panchanga and festival write-ups.
   - API Key manager (generate keys, view prefixes, revoke keys).
   - Live analytics: requests today, monthly quota consumption bar, and latency logs.

6. **Super Admin Portal (`/admin`)**:
   - System overview metrics (total users, active API keys, events, dates, requests).
   - **Interactive Admin Calendar**: Click any date to override tithi, toggle public holiday status, or add custom events.
   - **Events Manager**: Search, create, edit, and delete calendar events.
   - **User & Rate Limit Manager**: Change user tiers and customize RPM / monthly quotas.
   - **Scraper Center**: Run on-demand scraper for any BS year/month with live logs.

---

## 🚀 Quickstart & Local Setup

### 1. Requirements
- Node.js v18+ (tested on Node v24)
- PostgreSQL 16+ running on port 5432
- pnpm (recommended) or npm

### 2. Installation
```bash
cd nepali-calendar-api
pnpm install
```

### 3. Database Configuration
Create a `.env` file in the project root:
```env
DATABASE_URL="postgresql://sanishshakya@localhost:5432/nepali_calendar?schema=public"
JWT_SECRET="nepali-patro-calendar-jwt-secret-key-production-2026"
CRON_SECRET="nepali-patro-cron-sync-secret-key"
PORT=3000
```

Push Prisma schema and generate client:
```bash
npx prisma db push
npx prisma generate
```

### 4. Seed Database
Pre-populates subscription plans, Admin and Developer users, a demo API key, and pre-seeds BS 2083 calendar months:
```bash
npx tsx src/lib/seed.ts
```

### 5. Start Development or Production Server
```bash
# Production Build & Start
pnpm build
pnpm start -p 3000

# Or Development Mode
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## 🔑 Pre-Seeded Demo Accounts

| Role | Email | Password | Access / Plan |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@patro.dev` | `Admin@123456` | Full Admin Portal (`/admin`) |
| **Developer** | `dev@example.com` | `Dev@123456` | Developer Dashboard (`/dashboard`) & Pro Plan |
| **Demo API Key** | `np_live_demo1234567890abcdef12345678` | *(Use in `X-API-Key`)* | 1,200 RPM / 200k monthly quota |

*(1-click fill buttons are also provided on the `/login` page).*

---

## 📚 API Reference (v1)

Base URL: `http://localhost:3000/api/v1`

### 1. BS to AD Date Conversion
```bash
curl -X GET "http://localhost:3000/api/v1/convert/bs-to-ad?bs_year=2083&bs_month=5&bs_day=20" \
  -H "X-API-Key: np_live_demo1234567890abcdef12345678"
```
**Response:**
```json
{
  "success": true,
  "data": {
    "bs": {
      "year": 2083,
      "month": 5,
      "day": 20,
      "monthNameEn": "Bhadra",
      "monthNameNp": "भाद्र",
      "dayOfWeek": 6,
      "dayOfWeekEn": "Saturday",
      "dayOfWeekNp": "शनिवार",
      "dayBsNp": "२०",
      "yearBsNp": "२०८३",
      "formattedBs": "2083-05-20",
      "formattedBsNp": "२०८३-०५-२०"
    },
    "ad": {
      "year": 2026,
      "month": 9,
      "day": 5,
      "dayOfWeek": 6,
      "dayOfWeekEn": "Saturday",
      "dayOfWeekNp": "शनिवार",
      "formattedAd": "2026-09-05",
      "isoDate": "2026-09-05T00:00:00.000Z"
    },
    "verification_status": "VERIFIED"
  }
}
```

### 2. AD to BS Date Conversion
```bash
curl -X GET "http://localhost:3000/api/v1/convert/ad-to-bs?date=2026-09-05" \
  -H "X-API-Key: np_live_demo1234567890abcdef12345678"
```

### 3. Today's Date, Panchanga & Events
```bash
curl -X GET "http://localhost:3000/api/v1/calendar/today" \
  -H "X-API-Key: np_live_demo1234567890abcdef12345678"
```

### 4. Monthly Calendar Grid
```bash
curl -X GET "http://localhost:3000/api/v1/calendar/month?bs_year=2083&bs_month=5" \
  -H "X-API-Key: np_live_demo1234567890abcdef12345678"
```

### 5. Astrological Panchanga
```bash
curl -X GET "http://localhost:3000/api/v1/panchanga?bs_year=2083&bs_month=5&bs_day=20" \
  -H "X-API-Key: np_live_demo1234567890abcdef12345678"
```

### 6. Embeddable JavaScript Widget
```html
<div id="nepali-calendar-widget"></div>
<script src="http://localhost:3000/api/v1/widget/script.js?api_key=np_live_demo1234567890abcdef12345678"></script>
```

---

## ⏰ Automated Cron Job Setup

The application exposes a secure sync endpoint for cron schedulers:
```bash
curl -X GET "http://localhost:3000/api/cron/sync?secret=nepali-patro-cron-sync-secret-key"
```

### Setting up with crontab:
To run the sync every midnight (12:00 AM UTC):
```crontab
0 0 * * * curl -s "http://localhost:3000/api/cron/sync?secret=nepali-patro-cron-sync-secret-key" > /dev/null
```

---

## 📂 Project Architecture

```
nepali-calendar-api/
├── prisma/
│   └── schema.prisma              # PostgreSQL schema (Users, Subscriptions, ApiKeys, Dates, Events)
├── src/
│   ├── app/
│   │   ├── page.tsx               # Commercial Landing Page with live converter & pricing
│   │   ├── docs/page.tsx          # Interactive API Docs with live playground
│   │   ├── dashboard/page.tsx     # Developer Dashboard with Visual Nepali Calendar
│   │   ├── admin/page.tsx         # Super Admin Portal (Overrides, Event CRUD, Rate Limits, Scraper)
│   │   ├── login/page.tsx         # Login with demo quick-fill
│   │   ├── register/page.tsx      # Sign up & auto key provisioning
│   │   └── api/
│   │       ├── v1/                # Commercial REST API (convert, calendar, events, panchanga, widget)
│   │       ├── auth/              # JWT & session endpoints
│   │       ├── user/              # Key management & usage analytics
│   │       ├── admin/             # Admin stats, events CRUD, date overrides, custom rate limits
│   │       └── cron/sync/         # Automated sync cron
│   ├── components/
│   │   └── Navbar.tsx             # Responsive navbar with live today date badge
│   └── lib/
│       ├── prisma.ts              # Singleton Prisma PostgreSQL client
│       ├── auth/
│       │   ├── api-key.ts         # Key validation, rate-limiter & usage logger
│       │   └── jwt.ts             # JWT authentication
│       ├── nepali-calendar/
│       │   ├── bs-data.ts         # Canonical BS months, weekdays, tithis
│       │   ├── converter.ts       # Accurate BS <-> AD conversion engine
│       │   └── panchanga.ts       # Tithi, Nakshatra, Yoga, Karana & Sun times
│       ├── scraper/
│       │   ├── hamro-scraper.ts   # Scraper for hamropatro.com
│       │   └── reconciler.ts      # Database sync & reconciler
│       └── seed.ts                # Database seed script
```
