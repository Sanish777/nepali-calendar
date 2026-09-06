import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const apiKey = url.searchParams.get("api_key") || "";

  const jsContent = `
(function() {
  const container = document.getElementById("nep-calendar-scrape-widget");
  if (!container) return;

  const apiKey = "${apiKey}";
  const host = "${url.origin}";

  container.innerHTML = \`
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 360px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div id="np-widget-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
        <span style="font-weight: 700; font-size: 16px; color: #0f172a;">नेपाली पात्रो</span>
        <span id="np-widget-date" style="font-size: 13px; color: #dc2626; font-weight: 600;">लोड हुँदैछ...</span>
      </div>
      <div id="np-widget-body" style="padding: 12px 0;">
        <div id="np-widget-events" style="font-size: 12px; color: #475569;"></div>
      </div>
      <div style="text-align: right; border-top: 1px solid #f8fafc; padding-top: 6px;">
        <a href="\${host}" target="_blank" style="font-size: 10px; color: #94a3b8; text-decoration: none;">Powered by Miti API</a>
      </div>
    </div>
  \`;

  fetch(\`\${host}/api/v1/calendar/today\`, {
    headers: { "X-API-Key": apiKey }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const bs = data.data.bs;
      const tithi = data.data.tithi;
      const events = data.data.events;

      document.getElementById("np-widget-date").innerText = \`\${bs.monthNameNp} \${bs.dayBsNp}, \${bs.yearBsNp} (\${bs.dayOfWeekNp})\`;
      
      let html = \`<div style="margin-bottom: 6px; font-weight: 500; font-size: 13px; color: #1e293b;">तिथि: \${tithi.nameNp}</div>\`;
      if (events.length > 0) {
        html += '<div style="margin-top: 8px; font-weight: 600; font-size: 12px; color: #334155;">चाडपर्व / कार्यक्रमहरू:</div>';
        events.forEach(ev => {
          html += \`<div style="display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 12px; color: \${ev.isPublicHoliday ? '#dc2626' : '#2563eb'};">
            <span>•</span>
            <span>\${ev.titleNp}</span>
          </div>\`;
        });
      } else {
        html += '<div style="font-size: 12px; color: #64748b;">आज कुनै विशेष चाडपर्व छैन।</div>';
      }
      document.getElementById("np-widget-events").innerHTML = html;
    }
  })
  .catch(err => {
    console.error("Widget fetch error:", err);
  });
})();
  `;

  return new NextResponse(jsContent, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
