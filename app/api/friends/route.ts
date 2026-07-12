import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";
import { displayName, initials } from "@/lib/display-name";
import { notifyUser } from "@/lib/notifications/create";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function actorName(adminSb: any, userId: string): Promise<string> {
  const { data } = await adminSb.from("users").select("username, email").eq("id", userId).maybeSingle();
  return data ? displayName(data) : "Un joueur";
}

function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// GET /api/friends — liste mes amis, demandes reçues et demandes envoyées.
export async function GET() {
  const supabase = createServerSupabase();
  const adminSb = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { data: rows } = await adminSb
    .from("friendships")
    .select("id, user_low, user_high, requested_by, status")
    .or(`user_low.eq.${user.id},user_high.eq.${user.id}`);

  const friendships = rows ?? [];
  const otherIds = friendships.map(f => (f.user_low === user.id ? f.user_high : f.user_low));

  const { data: users } = otherIds.length
    ? await adminSb.from("users").select("id, username, email, avatar_url").in("id", otherIds)
    : { data: [] };
  const usersById = new Map((users ?? []).map(u => [u.id, u]));

  const friends: unknown[] = [];
  const incoming: unknown[] = [];
  const outgoing: unknown[] = [];

  for (const f of friendships) {
    const otherId = f.user_low === user.id ? f.user_high : f.user_low;
    const otherRow = usersById.get(otherId);
    if (!otherRow) continue;
    const name = displayName(otherRow);
    const entry = {
      friendshipId: f.id,
      userId: otherId,
      username: name,
      initials: initials(name),
      avatarUrl: otherRow.avatar_url ?? null,
    };
    if (f.status === "accepted") friends.push(entry);
    else if (f.status === "pending" && f.requested_by === user.id) outgoing.push(entry);
    else if (f.status === "pending" && f.requested_by !== user.id) incoming.push(entry);
  }

  return NextResponse.json({ friends, incoming, outgoing });
}

// POST /api/friends { targetUserId } — envoie une demande d'ami (ou l'accepte
// automatiquement si l'autre m'avait déjà demandé).
export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const adminSb = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { targetUserId } = await req.json();
  if (!targetUserId || typeof targetUserId !== "string") {
    return NextResponse.json({ error: "targetUserId manquant" }, { status: 400 });
  }
  if (targetUserId === user.id) {
    return NextResponse.json({ error: "Impossible de s'ajouter soi-même" }, { status: 400 });
  }

  const [userLow, userHigh] = pairKey(user.id, targetUserId);

  const { data: existing } = await adminSb
    .from("friendships")
    .select("id, status, requested_by")
    .eq("user_low", userLow)
    .eq("user_high", userHigh)
    .maybeSingle();

  if (!existing) {
    const { data: created, error } = await adminSb
      .from("friendships")
      .insert({ user_low: userLow, user_high: userHigh, requested_by: user.id, status: "pending" })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const nm = await actorName(adminSb, user.id);
    await notifyUser(adminSb, targetUserId, {
      type: "friend_request",
      title: "Nouvelle demande d'ami",
      body: `${nm} veut t'ajouter en ami sur Kayakbet.`,
      url: "/app?notif=friends",
      actorId: user.id,
    });
    return NextResponse.json({ friendshipId: created.id, status: "pending_outgoing" });
  }

  if (existing.status === "accepted") {
    return NextResponse.json({ friendshipId: existing.id, status: "friends" });
  }

  if (existing.status === "pending") {
    if (existing.requested_by === user.id) {
      return NextResponse.json({ friendshipId: existing.id, status: "pending_outgoing" });
    }
    // L'autre m'avait déjà demandé → accepter directement.
    const { error } = await adminSb
      .from("friendships")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const nm = await actorName(adminSb, user.id);
    await notifyUser(adminSb, targetUserId, {
      type: "friend_accepted",
      title: "Demande d'ami acceptée",
      body: `${nm} a accepté ta demande d'ami.`,
      url: "/app?notif=friends",
      actorId: user.id,
    });
    return NextResponse.json({ friendshipId: existing.id, status: "friends" });
  }

  // declined → relancer une demande de ma part
  const { error } = await adminSb
    .from("friendships")
    .update({ status: "pending", requested_by: user.id, updated_at: new Date().toISOString() })
    .eq("id", existing.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const nm = await actorName(adminSb, user.id);
  await notifyUser(adminSb, targetUserId, {
    type: "friend_request",
    title: "Nouvelle demande d'ami",
    body: `${nm} veut t'ajouter en ami sur Kayakbet.`,
    url: "/app?notif=friends",
    actorId: user.id,
  });
  return NextResponse.json({ friendshipId: existing.id, status: "pending_outgoing" });
}
