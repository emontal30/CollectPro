// Supabase Edge Function: send-email
// - Expects POST JSON: { to, subject, payload }
// - Uses RESEND_API_KEY (or custom provider) via project secrets
// - Sends email to admin instantly when user submits subscription

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Simple HTML email body builder
function buildHtml({ subject, payload }: { subject: string; payload: Record<string, unknown> }) {
  const rows = Object.entries(payload)
    .map(([k, v]) => `<tr><td style="padding:6px 10px;border:1px solid #eee">${k}</td><td style="padding:6px 10px;border:1px solid #eee">${String(v)}</td></tr>`) 
    .join("");
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#222">
    <h2 style="color:#16a34a;margin-bottom:8px">${subject}</h2>
    <table style="border-collapse:collapse;border:1px solid #eee">${rows}</table>
  </body></html>`;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { to, subject, payload } = await req.json();
    if (!to || !subject) {
      return new Response(JSON.stringify({ error: "Missing to/subject" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Choose provider: Resend (recommended) via RESEND_API_KEY
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      // Fallback: log only (so function works without secrets during dev)
      console.log("[send-email] Missing RESEND_API_KEY. Logging email only.", { to, subject, payload });
      return new Response(JSON.stringify({ ok: true, dev: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const html = buildHtml({ subject, payload: payload || {} });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CollectPro <no-reply@collectpro.app>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Resend error:", txt);
      return new Response(JSON.stringify({ error: "Email provider error", details: txt }), { status: 502, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-email error:", e);
    return new Response(JSON.stringify({ error: "Bad Request" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
});