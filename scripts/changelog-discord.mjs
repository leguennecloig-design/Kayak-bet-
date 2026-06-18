import { config } from "dotenv";
config({ path: ".env.local" });

const webhook = process.env.DISCORD_WEBHOOK;
if (!webhook) {
  console.error("❌ DISCORD_WEBHOOK manquant dans .env.local");
  process.exit(1);
}

const message = process.argv.slice(2).join(" ") || "Mise à jour Kayakbet";

const res = await fetch(webhook, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    content: `🚣 **Changelog Kayakbet**\n${message}`,
  }),
});

if (res.ok) {
  console.log("✅ Changelog envoyé sur Discord");
} else {
  console.error("❌ Erreur:", res.status, await res.text());
}
