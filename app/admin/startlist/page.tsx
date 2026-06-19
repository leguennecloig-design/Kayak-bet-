import { adminGuard } from "@/lib/auth/admin-guard";
import StartlistClient from "./StartlistClient";

export default async function StartlistPage() {
  await adminGuard();
  return <StartlistClient />;
}
