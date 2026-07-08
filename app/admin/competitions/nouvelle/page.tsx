import { adminGuard } from "@/lib/auth/admin-guard";
import NouvelleCompetitionClient from "./NouvelleCompetitionClient";

export default async function NouvelleCompetitionPage() {
  await adminGuard();
  return <NouvelleCompetitionClient />;
}
