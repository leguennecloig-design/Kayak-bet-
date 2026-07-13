import { adminGuard } from "@/lib/auth/admin-guard";
import UpdatesClient from "./UpdatesClient";

export default async function UpdatesPage() {
  await adminGuard();
  return <UpdatesClient />;
}
