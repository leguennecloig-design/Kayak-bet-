import { adminGuard } from "@/lib/auth/admin-guard";
import { classement, categories, CATEGORY_LABELS, Athlete } from "@/lib/athletes";
import AthletesClient from "./AthletesClient";

export default async function AthletesPage({
  searchParams,
}: {
  searchParams: { cat?: string };
}) {
  await adminGuard();

  const selectedCat =
    searchParams.cat && classement[searchParams.cat]
      ? searchParams.cat
      : categories[0];

  const athletes: Athlete[] = classement[selectedCat] ?? [];

  return (
    <AthletesClient
      selectedCat={selectedCat}
      athletes={athletes}
      categories={categories}
      labels={CATEGORY_LABELS}
    />
  );
}
