import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const outputDir = path.join(process.cwd(), 'public', 'docs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'nepali-calendar-api-docs.pdf');
const doc = new PDFDocument({ margin: 50, size: 'A4' });
doc.pipe(fs.createWriteStream(outputPath));

// Title
doc.fontSize(24).font('Helvetica-Bold').text('Miti API Documentation', { align: 'center' });
doc.moveDown(0.5);
doc.fontSize(12).font('Helvetica').fillColor('gray').text('Official Technical Reference', { align: 'center' });
doc.moveDown(3);

// 1. Authentication
doc.fillColor('black').fontSize(16).font('Helvetica-Bold').text('1. Authentication');
doc.moveDown(0.5);
doc.fontSize(11).font('Helvetica').text('Authenticate your API requests using your unique API Key. You can pass it in two ways:');
doc.moveDown();
doc.font('Courier-Bold').text('Header: ', { continued: true }).font('Courier').text('X-API-Key: np_live_123456789...');
doc.font('Courier-Bold').text('Query:  ', { continued: true }).font('Courier').text('?api_key=np_live_123456789...');
doc.moveDown(2);

// 2. Rate Limits
doc.fontSize(16).font('Helvetica-Bold').text('2. Rate Limits & Headers');
doc.moveDown(0.5);
doc.fontSize(11).font('Helvetica').text('Rate limits are dictated by the custom quota assigned to your token by the Administrator. Every API response includes the following HTTP headers tracking your usage:');
doc.moveDown();
doc.font('Courier').text('X-RateLimit-Limit:             (Requests allowed per minute)', { indent: 20 });
doc.font('Courier').text('X-RateLimit-Remaining:         (Requests left this minute)', { indent: 20 });
doc.font('Courier').text('X-RateLimit-Reset:             (Seconds until minute resets)', { indent: 20 });
doc.font('Courier').text('X-RateLimit-Monthly-Limit:     (Total requests allowed per month)', { indent: 20 });
doc.font('Courier').text('X-RateLimit-Monthly-Remaining: (Requests left this month)', { indent: 20 });
doc.moveDown(2);

// 3. Error Types
doc.fontSize(16).font('Helvetica-Bold').text('3. Error Handling & Status Codes');
doc.moveDown(0.5);
doc.fontSize(11).font('Helvetica').text('The API uses standard HTTP status codes. When an error occurs, the response body will be a JSON object detailing the failure.');
doc.moveDown();
const errors = [
  { code: '401 Unauthorized', msg: 'Missing or Invalid API Key.' },
  { code: '403 Forbidden', msg: 'API Key is deactivated or expired.' },
  { code: '429 Rate Limit', msg: 'Too Many Requests (Per minute exceeded).' },
  { code: '429 Quota Exceeded', msg: 'Monthly Quota Exceeded.' },
  { code: '400 Bad Request', msg: 'Invalid parameters (e.g. invalid date range).' },
];
errors.forEach(e => {
  doc.font('Helvetica-Bold').text(e.code, { indent: 20, continued: true });
  doc.font('Helvetica').text(` - ${e.msg}`);
});
doc.moveDown(0.5);
doc.font('Courier').fontSize(10).text(`{
  "success": false,
  "error": "RateLimitExceeded",
  "message": "Too many requests. Allowed rate is 60 requests per minute.",
  "retry_after_seconds": 32
}`, { indent: 20 });
doc.moveDown(2);

// 4. Endpoints
doc.addPage();
doc.fontSize(16).font('Helvetica-Bold').text('4. API Endpoints');
doc.moveDown(1);

const endpoints = [
  {
    path: 'GET /api/v1/calendar/today',
    desc: "Returns the current date in both Bikram Sambat (BS) and Gregorian (AD) formats.",
    response: `{
  "success": true,
  "data": {
    "bs": { "year": 2083, "month": 5, "day": 17, "dayOfWeekNp": "आइतबार" },
    "ad": { "year": 2026, "month": 9, "day": 2, "dayOfWeek": "Sunday" }
  }
}`
  },
  {
    path: 'GET /api/v1/calendar/date?bs_year=Y&bs_month=M&bs_day=D',
    desc: "Fetch detailed information for a specific Bikram Sambat date.",
    response: `{
  "success": true,
  "data": {
    "year_bs": 2083, "month_bs": 5, "day_bs": 17,
    "is_holiday": false, "tithi": "एकादशी"
  }
}`
  },
  {
    path: 'GET /api/v1/calendar/month?year=Y&month=M',
    desc: "Returns an entire month's calendar.",
    response: `{
  "success": true,
  "data": {
    "days_in_month": 31,
    "start_day_of_week": 0,
    "days": [ ... array of day objects ... ]
  }
}`
  },
  {
    path: 'GET /api/v1/convert/bs-to-ad?year=Y&month=M&day=D',
    desc: "Convert a Bikram Sambat date to Gregorian.",
    response: `{
  "success": true,
  "data": {
    "bs": { ... }, "ad": { "isoDate": "2026-09-02T00:00:00Z", ... }
  }
}`
  },
  {
    path: 'GET /api/v1/convert/ad-to-bs?year=Y&month=M&day=D',
    desc: "Convert a Gregorian date to Bikram Sambat.",
    response: `{
  "success": true,
  "data": { "bs": { ... }, "ad": { ... } }
}`
  },
  {
    path: 'GET /api/v1/events?year=Y&month=M',
    desc: "Returns a list of all festivals and events for a specific month.",
    response: `{
  "success": true,
  "data": [
    { "id": "...", "title_en": "Dashain", "is_public_holiday": true }
  ]
}`
  }
];

endpoints.forEach(ep => {
  doc.fontSize(12).font('Helvetica-Bold').text(ep.path);
  doc.fontSize(11).font('Helvetica').text(ep.desc, { indent: 10 });
  doc.moveDown(0.5);
  doc.font('Courier').fontSize(9).fillColor('#333333').text(ep.response, { indent: 20 });
  doc.moveDown(1.5);
  doc.fillColor('black');
});

doc.end();

console.log('PDF documentation generated successfully at', outputPath);
