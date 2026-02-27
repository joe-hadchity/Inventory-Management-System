import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/authz";
import { InventoryPageClient } from "@/components/inventory/InventoryPageClient";

export default async function InventoryPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin/inventory");
  return <InventoryPageClient role={profile.role} />;
}
