import webpush from "web-push";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string };

async function sendToSubscriptions(subs: SubRow[], payload: PushPayload, supabase: SupabaseAny) {
  ensureConfigured();
  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (e) {
        const statusCode = (e as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Abonnement expiré/révoqué côté navigateur — on le retire.
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error(`[push] envoi échoué (sub ${sub.id}):`, e);
        }
      }
    })
  );
}

export async function sendPushToUser(supabase: SupabaseAny, userId: string, payload: PushPayload) {
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error || !subs?.length) return;
  await sendToSubscriptions(subs as SubRow[], payload, supabase);
}

export async function sendPushToAll(supabase: SupabaseAny, payload: PushPayload) {
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");
  if (error || !subs?.length) return { sent: 0 };
  await sendToSubscriptions(subs as SubRow[], payload, supabase);
  return { sent: subs.length };
}
