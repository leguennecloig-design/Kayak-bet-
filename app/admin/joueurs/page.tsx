import { adminGuard } from "@/lib/auth/admin-guard";
import JoueursClient from "./JoueursClient";

export default async function JoueursPage() {
  await adminGuard();
  return <JoueursClient />;
}
