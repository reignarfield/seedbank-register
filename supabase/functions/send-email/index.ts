// Sends one email on the signed-in owner's behalf, through Resend. The app
// composes the message (an invoice, a quote) and this function only adds the
// secret and forwards it - so a key never lives in a page anyone can read.
//
// Until RESEND_API_KEY and FROM_EMAIL are set as function secrets this
// answers 503 with a plain message, and the app shows "Email isn't set up
// yet" instead of pretending. Deploy with:
//
//   supabase functions deploy send-email
//   supabase secrets set RESEND_API_KEY=re_xxx FROM_EMAIL="Tydie Cleaning <jobs@yourdomain.com>"
//
// verify_jwt is on by default for Edge Functions, so only a signed-in user of
// this project can call it.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  if (!RESEND_API_KEY || !FROM_EMAIL) {
    return json(503, { error: "Email isn't set up yet.", detail: "Set RESEND_API_KEY and FROM_EMAIL on the send-email function." });
  }

  let body: { to?: string; subject?: string; html?: string; text?: string; reply_to?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Body must be JSON." });
  }
  const { to, subject, html, text, reply_to } = body;
  if (!to || !subject || !(html || text)) return json(400, { error: "to, subject and html (or text) are required." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json(400, { error: "That doesn't look like an email address." });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html, text, reply_to }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("resend error", res.status, data);
    return json(502, { error: "The email service refused it.", detail: data?.message || res.status });
  }
  return json(200, { id: data.id });
});
