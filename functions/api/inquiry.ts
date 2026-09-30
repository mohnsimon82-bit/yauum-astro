// POST /api/inquiry — server-side inquiry delivery via Resend.
//
// The browser posts the form here (same origin) and this Function calls Resend
// with the API key, so the key never reaches the client. Replaces the previous
// direct-to-formsubmit.co fan-out, which failed when FormSubmit's endpoint
// started returning HTTP 500 for every submission.
//
// Accepts JSON (the normal AJAX path) and application/x-www-form-urlencoded
// (the no-JS native form fallback). Returns JSON for JSON requests and a small
// HTML page for form posts, so the no-JS path lands somewhere readable.
//
// Configuration (Pages project environment variables / secrets):
//   RESEND_API_KEY  required — Resend API key
//   INQUIRY_TO      optional — comma-separated recipients
//                              (default: mumu@yauum.com + the two notifiers)
//   INQUIRY_FROM    optional — verified-domain sender
//                              (default: Yauum Website <website@yauum.com>)

interface Env {
  RESEND_API_KEY?: string;
  INQUIRY_TO?: string;
  INQUIRY_FROM?: string;
}

const DEFAULT_TO = ["mumu@yauum.com", "397740930@qq.com", "aisen@qyoure.com"];
const DEFAULT_FROM = "Yauum Website <website@yauum.com>";
const SUBJECT_FALLBACK = "Yauum website inquiry";
const MAX_FIELD = 5000;

// Field order for the notification email; anything else in the payload is
// appended so tracking fields added later still arrive.
const FIELD_ORDER: Array<[string, string]> = [
  ["name", "Name"],
  ["email", "Email"],
  ["garment_type", "Garment type"],
  ["moq_tier", "Quantity"],
  ["message", "Project details"],
  ["country", "Country"],
  ["city", "City"],
  ["traffic_source", "Traffic source"],
  ["channel", "Channel"],
  ["entry_page", "Entry page"],
  ["entry_referrer", "Entry referrer"],
  ["source_page", "Source page"],
  ["garment_page", "Garment page"],
  ["submitted_at", "Submitted at"],
];

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function rows(payload: Record<string, string>): Array<[string, string]> {
  const seen = new Set<string>();
  const out: Array<[string, string]> = [];
  for (const [key, label] of FIELD_ORDER) {
    const value = (payload[key] || "").trim();
    if (value) { out.push([label, value]); seen.add(key); }
  }
  for (const [key, value] of Object.entries(payload)) {
    if (seen.has(key) || key.startsWith("_") || !value.trim()) continue;
    out.push([key, String(value).trim()]);
  }
  return out;
}

function buildHtml(payload: Record<string, string>): string {
  const body = rows(payload).map(([label, value]) =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font:500 13px/1.5 -apple-system,Segoe UI,sans-serif;color:#606760;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>` +
    `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font:400 14px/1.6 -apple-system,Segoe UI,sans-serif;color:#141614">${escapeHtml(value).replace(/\n/g, "<br>")}</td></tr>`,
  ).join("");
  return `<div style="max-width:640px"><table style="width:100%;border-collapse:collapse;background:#fff">${body}</table></div>`;
}

const buildText = (payload: Record<string, string>): string =>
  rows(payload).map(([label, value]) => `${label}: ${value}`).join("\n");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function htmlResponse(title: string, message: string, status = 200): Response {
  const page = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>` +
    `<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#F4F4F0;color:#141614;` +
    `font:400 16px/1.6 Inter,-apple-system,Segoe UI,sans-serif">` +
    `<main style="max-width:520px;padding:32px;text-align:center">` +
    `<h1 style="font-size:22px;margin:0 0 12px">${escapeHtml(title)}</h1>` +
    `<p style="margin:0 0 20px;color:#606760">${escapeHtml(message)}</p>` +
    `<a href="/" style="display:inline-block;padding:13px 26px;background:#131613;color:#F3F4EF;text-decoration:none">Back to homepage</a>` +
    `</main></body></html>`;
  return new Response(page, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** Only same-site submissions and direct curl testing (no Origin) are served. */
function originAllowed(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname;
    return host === "yauum.com" || host === "www.yauum.com" || host.endsWith(".yauum.com")
      || host.endsWith(".pages.dev") || host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

async function readPayload(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("Content-Type") || "";
  const payload: Record<string, string> = {};
  if (type.includes("application/json")) {
    const parsed = await request.json().catch(() => ({})) as Record<string, unknown>;
    for (const [key, value] of Object.entries(parsed)) payload[key] = String(value ?? "");
  } else {
    const form = await request.formData();
    for (const [key, value] of form.entries()) payload[key] = typeof value === "string" ? value : value.name;
  }
  return payload;
}

export const onRequestPost = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context;
  const wantsJson = (request.headers.get("Accept") || "").includes("application/json")
    || (request.headers.get("Content-Type") || "").includes("application/json");

  if (!originAllowed(request)) {
    return wantsJson
      ? jsonResponse({ success: false, error: "origin not allowed" }, 403)
      : htmlResponse("Something went wrong", "Please email mumu@yauum.com instead.", 403);
  }

  const payload = await readPayload(request);

  // Honeypot: bots fill it, humans never see it. Accept silently.
  if ((payload._honey || "").trim()) {
    return wantsJson ? jsonResponse({ success: true }) : htmlResponse("Thank you", "Your inquiry is on its way.");
  }

  const name = (payload.name || "").trim();
  const email = (payload.email || "").trim();
  const message = (payload.message || "").trim();
  const tooLong = Object.values(payload).some((value) => value.length > MAX_FIELD);
  if (!name || !email || !message || tooLong || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return wantsJson
      ? jsonResponse({ success: false, error: "invalid submission" }, 400)
      : htmlResponse("Something went wrong", "Please check your name, email, and project details, or email mumu@yauum.com.", 400);
  }

  const apiKey = (env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    return wantsJson
      ? jsonResponse({ success: false, error: "email service not configured" }, 503)
      : htmlResponse("Something went wrong", "Please email mumu@yauum.com instead.", 503);
  }

  const recipients = (env.INQUIRY_TO || "").split(",").map((s) => s.trim()).filter(Boolean);
  const to = recipients.length ? recipients : DEFAULT_TO;
  const from = (env.INQUIRY_FROM || "").trim() || DEFAULT_FROM;
  const subject = (payload._subject || "").trim() || SUBJECT_FALLBACK;

  let resend: Response;
  try {
    resend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        reply_to: (payload._replyto || email).trim(),
        subject,
        html: buildHtml(payload),
        text: buildText(payload),
      }),
    });
  } catch {
    return wantsJson
      ? jsonResponse({ success: false, error: "delivery request failed" }, 502)
      : htmlResponse("Something went wrong", "Please email mumu@yauum.com instead.", 502);
  }

  if (!resend.ok) {
    const detail = await resend.text().catch(() => "");
    return wantsJson
      ? jsonResponse({ success: false, error: "delivery rejected", detail: detail.slice(0, 300) }, 502)
      : htmlResponse("Something went wrong", "Please email mumu@yauum.com instead.", 502);
  }

  return wantsJson
    ? jsonResponse({ success: true })
    : htmlResponse("Thank you", "Your inquiry is on its way. We reply within one business day.");
};
