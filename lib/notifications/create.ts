import { sendPushToUser, sendPushToAll } from "@/lib/push/send";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "referral_used"
  | "bet_won"
  | "bet_lost"
  | "bet_cancelled"
  | "competition"
  | "broadcast"
  | "instagram_reward_approved"
  | "instagram_reward_rejected";

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

// Diffusion à TOUS les joueurs : une notification sur le site pour chacun
// (insert en masse) + un push à tous. Utilisé pour "nouvelle compétition" et
// les annonces admin. Ne jette jamais.
export async function notifyAllUsers(
  supabase: SupabaseAny,
  n: { type: NotificationType; title: string; body: string; url?: string }
) {
  try {
    const { data: users } = await supabase.from("users").select("id");
    const rows = (users ?? []).map((u: { id: string }) => ({
      user_id: u.id,
      type:    n.type,
      title:   n.title,
      body:    n.body,
      url:     n.url ?? "/app",
    }));
    if (rows.length > 0) {
      // insert par lots pour éviter une requête géante
      for (let i = 0; i < rows.length; i += 500) {
        await supabase.from("notifications").insert(rows.slice(i, i + 500));
      }
    }
  } catch (e) {
    console.error("[notifyAll] insertion notifications échouée:", e);
  }

  try {
    return await sendPushToAll(supabase, { title: n.title, body: n.body, url: n.url ?? "/app" });
  } catch (e) {
    console.error("[notifyAll] push échoué:", e);
    return { sent: 0 };
  }
}
