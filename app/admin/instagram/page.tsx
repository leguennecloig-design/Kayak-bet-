import { adminGuard } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import InstagramClient, { type IgRequest } from "./InstagramClient";

export default async function InstagramPage() {
  await adminGuard();

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, email, instagram_reward_handle, instagram_reward_requested_at")
    .eq("instagram_reward_status", "pending")
    .order("instagram_reward_requested_at", { ascending: true });

  const requests: IgRequest[] = (error ? [] : (data ?? [])).map((u) => ({
    userId:      u.id,
    username:    u.username ?? null,
    email:       u.email ?? null,
    handle:      u.instagram_reward_handle ?? null,
    requestedAt: u.instagram_reward_requested_at ?? null,
  }));

  return <InstagramClient initialRequests={requests} unavailable={!!error} />;
}
