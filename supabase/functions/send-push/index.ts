// Push sending, scaffolded and not scheduled. Given a title, body and
// optional URL, sends a notification to every device that opted in (see
// push_subscriptions). Meant to be called by the reminder function or a cron
// once the owner has decided which nudges deserve a buzz - nothing calls it
// yet.
//
// Needs VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT (a mailto:)
// as function secrets. Generate a pair once with `npx web-push generate-vapid-keys`;
// the public half also goes into the app's build as VITE_VAPID_PUBLIC_KEY.

import webpush from "npm:web-push@3";
import { createClient } from "npm:@supabase/supabase-js@2";

const PUB = Deno.env.get("VAPID_PUBLIC_KEY");
const PRIV = Deno.env.get("VAPID_PRIVATE_KEY");
const SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:owner@example.com";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST only" });
  if (!PUB || !PRIV) return json(503, { error: "Push isn't set up yet.", detail: "Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY on the send-push function." });
  webpush.setVapidDetails(SUBJECT, PUB, PRIV);

  const { title, body, url, tag } = await req.json().catch(() => ({}));
  if (!title) return json(400, { error: "title is required" });

  const { data: subs, error } = await supabase.from("push_subscriptions").select("id, endpoint, keys").is("disabled_at", null);
  if (error) return json(500, { error: error.message });

  const results = { sent: 0, gone: 0, failed: 0 };
  for (const s of subs || []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ title, body, url, tag }));
      results.sent++;
    } catch (e: unknown) {
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        // The device unsubscribed or the browser dropped it - stop trying.
        await supabase.from("push_subscriptions").update({ disabled_at: new Date().toISOString() }).eq("id", s.id);
        results.gone++;
      } else {
        results.failed++;
      }
    }
  }
  return json(200, results);
});
