import { sendPushToUser } from "@/lib/push/send";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export type NotificationType = "friend_request" | "friend_accepted" | "referral_used";

// Crée une notification sur le site (table notifications) ET envoie un push,
// en une seule fonction. Ne jette jamais : une notif ratée ne doit pas casser
// l'action métier qui l'a déclenchée (demande d'ami, parrainage…).
export async function notifyUser(
  supabase: SupabaseAny,
  userId: string,
  n: { type: NotificationType; title: string; body: string; url?: string; actorId?: string }
) {
  try {
    await supabase.from("notifications").insert({
      user_id:  userId,
      type:     n.type,
      title:    n.title,
      body:     n.body,
      url:      n.url ?? "/app",
      actor_id: n.actorId ?? null,
    });
  } catch (e) {
    // La table n'existe peut-être pas encore (migration 20260721 non appliquée)
    // — on ne bloque pas, le push part quand même.
    console.error("[notify] insertion notification échouée:", e);
  }

  try {
    await sendPushToUser(supabase, userId, { title: n.title, body: n.body, url: n.url ?? "/app" });
  } catch (e) {
    console.error("[notify] push échoué:", e);
  }
}
