import { adminGuard } from "@/lib/auth/admin-guard";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage() {
  await adminGuard();
  return <NotificationsClient />;
}
