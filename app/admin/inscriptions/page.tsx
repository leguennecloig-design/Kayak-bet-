import { adminGuard } from "@/lib/auth/admin-guard";
import InscriptionsClient from "./InscriptionsClient";

export default async function InscriptionsPage() {
  await adminGuard();
  return <InscriptionsClient />;
}
