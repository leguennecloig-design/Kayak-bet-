import { config } from "dotenv";
config({ path: ".env.local" });

import { run as importClassement } from "./import-classement.js";
import { run as syncCompetitions } from "./sync-competitions.js";
import { run as syncResultats }    from "./sync-resultats.js";

async function main() {
  console.log("🚀 Kayakbet — Synchronisation complète\n");
  console.log("━".repeat(50));

  // 1. Classement
  console.log("\n[1/3] Import classement numérique 2026...");
  const { count } = await importClassement();
  console.log(`✅ ${count} athlètes importés`);

  // 2. Compétitions
  console.log("\n[2/3] Sync compétitions 2024–2026...");
  const { competitions, courses } = await syncCompetitions([2024, 2025, 2026]);
  console.log(`✅ ${competitions} compétitions, ${courses} courses`);

  // 3. Résultats
  console.log("\n[3/3] Sync résultats (toutes les courses)...");
  const { resultats, courses: coursesSynced } = await syncResultats();
  console.log(`✅ ${resultats} résultats (${coursesSynced} courses)`);

  console.log("\n" + "━".repeat(50));
  console.log("🏁 Synchronisation terminée !");
}

main().catch((err) => {
  console.error("\n❌ Erreur fatale:", err);
  process.exit(1);
});
