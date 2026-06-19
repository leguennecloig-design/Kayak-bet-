import { config } from "dotenv";
config({ path: ".env.local" });

const webhook = process.env.DISCORD_WEBHOOK;
if (!webhook) {
  console.error("❌ DISCORD_WEBHOOK manquant dans .env.local");
  process.exit(1);
}

const args = process.argv.slice(2);

// Parse des sections passées en argument : --nouveautes "..." --ameliorations "..."
function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}

const nouveautes = getArg("--nouveautes");
const ameliorations = getArg("--ameliorations");
const titre = getArg("--titre") || `🚣 MAJ — ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;

const fields = [];
if (nouveautes) {
  fields.push({
    name: "✨ Nouveautés",
    value: nouveautes.split("|").map((l) => `• ${l.trim()}`).join("\n"),
  });
}
if (ameliorations) {
  fields.push({
    name: "⚡ Améliorations",
    value: ameliorations.split("|").map((l) => `• ${l.trim()}`).join("\n"),
  });
}
if (!fields.length) {
  fields.push({ name: "📝 Mise à jour", value: args.join(" ") || "Déploiement en cours" });
}

const embed = {
  author: {
    name: "Kayakbet — Changelog",
    icon_url: "https://kayakbet.vercel.app/icon-192.png",
  },
  title: titre,
  color: 0x28D7E6, // cyan Kayakbet
  fields,
  footer: { text: "kayakbet.fr  •  100% gratuit, 100% sensations" },
  timestamp: new Date().toISOString(),
};

const res = await fetch(webhook, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: "Kayakbet",
    avatar_url: "https://kayakbet.vercel.app/icon-192.png",
    embeds: [embed],
  }),
});

if (res.ok) {
  console.log("✅ Changelog envoyé sur Discord");
} else {
  console.error("❌ Erreur:", res.status, await res.text());
}
