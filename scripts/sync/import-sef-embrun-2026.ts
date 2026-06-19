import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PREFIX = "[SEF Embrun 2026]";

type Row = {
  rang: number | null;
  code_bateau: string;
  categorie: string;
  temps_ms: number | null;
  dsq?: boolean;
  coureur1: string;
  coureur2?: string;
};

// Codes bateaux exclus (athlètes U18/U15)
const EXCLUDED_CODES = new Set([
  "K1H328386", "C2H328386",  // Loig LE GUENNEC
  "K1H455712", "C2H455712",  // Nolann FIDON
  "C1H328126", "K1H328126",  // Ilyan DINALLY
  "K1H346880", "C2H346880",  // Noa NIKIEMA-SCHWARZ
  "K1H348521", "C2H348521",  // Quentin DE NARP
  "K1H413616", "C2H413616",  // Martin YOCHUM
]);

// ─── COURSE 1 — Classique — 08/04/2026 ───────────────────────────────────────

const COURSE1: Row[] = [
  // C1D
  { rang:  1, code_bateau: "C1D264765", categorie: "C1D",    temps_ms: 1281850, coureur1: "Laura FONTAINE" },
  { rang:  2, code_bateau: "C1D290601", categorie: "C1D",    temps_ms: 1289430, coureur1: "Eve VITALI-GUILBERT" },
  { rang:  3, code_bateau: "C1D224719", categorie: "C1D",    temps_ms: 1346680, coureur1: "Elsa GAUBERT" },
  // C1H
  { rang:  1, code_bateau: "C1H222871", categorie: "C1HM22", temps_ms: 1188470, coureur1: "Nicolas SAUTEUR" },
  { rang:  2, code_bateau: "C1H194386", categorie: "C1HM22", temps_ms: 1191550, coureur1: "Theo VIENS" },
  { rang:  3, code_bateau: "C1H215482", categorie: "C1HM22", temps_ms: 1209350, coureur1: "Charles FERRION" },
  { rang:  4, code_bateau: "C1H296766", categorie: "C1HM22", temps_ms: 1223480, coureur1: "Gaetan ROUSSEAU" },
  { rang:  5, code_bateau: "C1H214315", categorie: "C1HM22", temps_ms: 1242170, coureur1: "Etienne KLATT" },
  { rang:  6, code_bateau: "C1H325556", categorie: "C1HU21", temps_ms: 1249260, coureur1: "Paul DELEPLANCQUE" },
  { rang:  7, code_bateau: "C1H258449", categorie: "C1HU21", temps_ms: 1277820, coureur1: "Jan Gabin PISCHEK" },
  { rang:  8, code_bateau: "C1H171961", categorie: "C1HM22", temps_ms: 1279130, coureur1: "Pierre DESEUSTE" },
  { rang:  9, code_bateau: "C1H453857", categorie: "C1HU21", temps_ms: 1281810, coureur1: "Yoan BREISCH" },
  // rang 10 Breisch (même code_bateau + categorie → doublon UNIQUE, skip)
  { rang: null, code_bateau: "C1H309196", categorie: "C1HM22", temps_ms: null, dsq: true, coureur1: "Matteo ZANNI" },
  // C2H  (rang 6 LE GUENNEC/FIDON → EXCLU, rangs 7 et 8 conservés tels quels)
  { rang: 1, code_bateau: "C2H252875252876", categorie: "C2H", temps_ms: 1148720, coureur1: "Manoël ROUSSIN",     coureur2: "Tanguy ROUSSIN" },
  { rang: 2, code_bateau: "C2H194386222871", categorie: "C2H", temps_ms: 1153870, coureur1: "Theo VIENS",         coureur2: "Nicolas SAUTEUR" },
  { rang: 3, code_bateau: "C2H239805241168", categorie: "C2H", temps_ms: 1190880, coureur1: "Corentin COMBE",     coureur2: "Clement MONJANEL" },
  { rang: 4, code_bateau: "C2H316181316182", categorie: "C2H", temps_ms: 1217050, coureur1: "Dimitri TOSTAIN",    coureur2: "Jerome PAYEN" },
  { rang: 5, code_bateau: "C2H283160325556", categorie: "C2H", temps_ms: 1243850, coureur1: "Lucas DELEPLANCQUE", coureur2: "Paul DELEPLANCQUE" },
  { rang: 7, code_bateau: "C2H309147327679", categorie: "C2H", temps_ms: 1258220, coureur1: "Matthieu BESSIERE",  coureur2: "Thomas CIEKALA" },
  { rang: 8, code_bateau: "C2H238733387409", categorie: "C2H", temps_ms: 1284500, coureur1: "Thibaut COLLIGNON",  coureur2: "Mathieu DUBOIS" },
  // K1D
  { rang:  1, code_bateau: "K1D290601", categorie: "K1DU21", temps_ms: 1181800, coureur1: "Eve VITALI-GUILBERT" },
  { rang:  2, code_bateau: "K1D269173", categorie: "K1DU21", temps_ms: 1191830, coureur1: "Noa PRADALIER" },
  { rang:  3, code_bateau: "K1D264765", categorie: "K1DM22", temps_ms: 1193440, coureur1: "Laura FONTAINE" },
  { rang:  4, code_bateau: "K1D242439", categorie: "K1DM22", temps_ms: 1195260, coureur1: "Emma LACOSTE" },
  { rang:  5, code_bateau: "K1D365500", categorie: "K1DU21", temps_ms: 1222700, coureur1: "Camille DESMERGER" },
  { rang:  6, code_bateau: "K1D196731", categorie: "K1DM22", temps_ms: 1224910, coureur1: "Lisa LEBOUC" },
  { rang:  7, code_bateau: "K1D183216", categorie: "K1DM22", temps_ms: 1226360, coureur1: "Clara GAUBERT" },
  { rang:  8, code_bateau: "K1D295071", categorie: "K1DM22", temps_ms: 1228150, coureur1: "Elke SARAGAS" },
  { rang:  9, code_bateau: "K1D433941", categorie: "K1DU21", temps_ms: 1241220, coureur1: "Elina PROCESSE" },
  { rang: 10, code_bateau: "K1D280682", categorie: "K1DU21", temps_ms: 1243950, coureur1: "Nora KOUBAITI" },
  { rang: 11, code_bateau: "K1D383815", categorie: "K1DU21", temps_ms: 1244800, coureur1: "Luna LLORET LINARES" },
  { rang: 12, code_bateau: "K1D294600", categorie: "K1DM22", temps_ms: 1244860, coureur1: "Julie HUCHON" },
  { rang: 13, code_bateau: "K1D351422", categorie: "K1DU21", temps_ms: 1248760, coureur1: "Carole HUIBAN-DESCOFFRE" },
  { rang: 14, code_bateau: "K1D323482", categorie: "K1DU21", temps_ms: 1260020, coureur1: "Marine ROULAND" },
  { rang: null, code_bateau: "K1D224719", categorie: "K1DM22", temps_ms: null, dsq: true, coureur1: "Elsa GAUBERT" },
  // K1H  (exclu: NIKIEMA-SCHWARZ rang 15, LE GUENNEC rang 19, FIDON rang 20; doublon PELLISSIER rang 21; ROPERS sans code → skip)
  { rang:  1, code_bateau: "K1H223126", categorie: "K1HM22", temps_ms: 1061630, coureur1: "Augustin REBOUL" },
  { rang:  2, code_bateau: "K1H195229", categorie: "K1HM22", temps_ms: 1069230, coureur1: "Maxence BAROUH" },
  { rang:  3, code_bateau: "K1H339933", categorie: "K1HM22", temps_ms: 1088700, coureur1: "Leandre BEAULANDE NOEL" },
  { rang:  4, code_bateau: "K1H243099", categorie: "K1HM22", temps_ms: 1097170, coureur1: "Corentin GEORGEON" },
  { rang:  5, code_bateau: "K1H316181", categorie: "K1HM22", temps_ms: 1100270, coureur1: "Dimitri TOSTAIN" },
  { rang:  6, code_bateau: "K1H241168", categorie: "K1HM22", temps_ms: 1107870, coureur1: "Clement MONJANEL" },
  { rang:  7, code_bateau: "K1H416272", categorie: "K1HU21", temps_ms: 1120450, coureur1: "Axel DURRACQ" },
  { rang:  8, code_bateau: "K1H340002", categorie: "K1HU21", temps_ms: 1122470, coureur1: "Felix GRONDIN" },
  { rang:  9, code_bateau: "K1H244233", categorie: "K1HM22", temps_ms: 1122930, coureur1: "Maxence GUIZIOU" },
  { rang: 10, code_bateau: "K1H239805", categorie: "K1HM22", temps_ms: 1124540, coureur1: "Corentin COMBE" },
  { rang: 11, code_bateau: "K1H309114", categorie: "K1HU21", temps_ms: 1132790, coureur1: "Louis PAGES" },
  { rang: 12, code_bateau: "K1H316182", categorie: "K1HM22", temps_ms: 1136350, coureur1: "Jerome PAYEN" },
  { rang: 12, code_bateau: "K1H241898", categorie: "K1HM22", temps_ms: 1136350, coureur1: "Titouan DOREAU" },
  { rang: 14, code_bateau: "K1H298267", categorie: "K1HU21", temps_ms: 1140060, coureur1: "Hugo PELLISSIER" },
  // rang 15 NIKIEMA-SCHWARZ → EXCLU
  { rang: 16, code_bateau: "K1H235470",    categorie: "K1HM22", temps_ms: 1146720, coureur1: "Jules MIGLINIEKS" },
  { rang: 17, code_bateau: "K1H_ROUBINET", categorie: "K1HM22", temps_ms: 1148160, coureur1: "Aurelien ROUBINET" },
  { rang: 18, code_bateau: "K1H_FRANCOIS", categorie: "K1HM22", temps_ms: 1152010, coureur1: "Alban FRANCOIS SIFFERT" },
  // rang 19 LE GUENNEC → EXCLU
  // rang 20 FIDON → EXCLU
  // rang 21 PELLISSIER doublon → SKIP (même K1H298267 + K1HU21 que rang 14)
  { rang: 22, code_bateau: "K1H324904",    categorie: "K1HU21", temps_ms: 1166610, coureur1: "Audren LE DORE" },
  { rang: 23, code_bateau: "K1H_KLICHAMER",categorie: "K1HM22", temps_ms: 1169200, coureur1: "Ivann KLICHAMER-JANUEL" },
  { rang: 24, code_bateau: "K1H238733",    categorie: "K1HM22", temps_ms: 1177280, coureur1: "Thibaut COLLIGNON" },
  { rang: 25, code_bateau: "K1H309147",    categorie: "K1HM22", temps_ms: 1181630, coureur1: "Matthieu BESSIERE" },
  // Noah ROPERS DSQ sans code_bateau connu → skip
  { rang: null, code_bateau: "K1H280999", categorie: "K1HM22", temps_ms: null, dsq: true, coureur1: "Luca BARONE" },
  { rang: null, code_bateau: "K1H329293", categorie: "K1HM22", temps_ms: null, dsq: true, coureur1: "Raphael BONNARD" },
];

// ─── COURSE 2 — Sprint N°1 Finale A — 09/04/2026 ─────────────────────────────

const COURSE2: Row[] = [
  // C1D
  { rang: 1, code_bateau: "C1D264765", categorie: "C1D", temps_ms:  62090, coureur1: "Laura FONTAINE" },
  { rang: 2, code_bateau: "C1D224719", categorie: "C1D", temps_ms:  63670, coureur1: "Elsa GAUBERT" },
  { rang: 3, code_bateau: "C1D290601", categorie: "C1D", temps_ms:  63910, coureur1: "Eve VITALI-GUILBERT" },
  // C1H  (rang 8 DINALLY → EXCLU)
  { rang: 1, code_bateau: "C1H214315", categorie: "C1HM22", temps_ms: 56160, coureur1: "Etienne KLATT" },
  { rang: 2, code_bateau: "C1H215482", categorie: "C1HM22", temps_ms: 56220, coureur1: "Charles FERRION" },
  { rang: 3, code_bateau: "C1H222871", categorie: "C1HM22", temps_ms: 56340, coureur1: "Nicolas SAUTEUR" },
  { rang: 4, code_bateau: "C1H309196", categorie: "C1HM22", temps_ms: 56970, coureur1: "Matteo ZANNI" },
  { rang: 5, code_bateau: "C1H296766", categorie: "C1HM22", temps_ms: 57470, coureur1: "Gaetan ROUSSEAU" },
  { rang: 6, code_bateau: "C1H194386", categorie: "C1HM22", temps_ms: 57770, coureur1: "Theo VIENS" },
  { rang: 7, code_bateau: "C1H258449", categorie: "C1HU21", temps_ms: 58370, coureur1: "Jan Gabin PISCHEK" },
  // rang 8 DINALLY → EXCLU
  // C2H  (rang 5 LE GUENNEC/FIDON → EXCLU, rangs 6-8 conservés)
  { rang: 1, code_bateau: "C2H239805241168", categorie: "C2H", temps_ms: 53950, coureur1: "Corentin COMBE",     coureur2: "Clement MONJANEL" },
  { rang: 2, code_bateau: "C2H252875252876", categorie: "C2H", temps_ms: 54070, coureur1: "Manoël ROUSSIN",     coureur2: "Tanguy ROUSSIN" },
  { rang: 3, code_bateau: "C2H194386222871", categorie: "C2H", temps_ms: 54330, coureur1: "Theo VIENS",         coureur2: "Nicolas SAUTEUR" },
  { rang: 4, code_bateau: "C2H316181316182", categorie: "C2H", temps_ms: 55230, coureur1: "Dimitri TOSTAIN",    coureur2: "Jerome PAYEN" },
  // rang 5 LE GUENNEC/FIDON → EXCLU
  { rang: 6, code_bateau: "C2H309147327679", categorie: "C2H", temps_ms: 56890, coureur1: "Matthieu BESSIERE",  coureur2: "Thomas CIEKALA" },
  { rang: 7, code_bateau: "C2H283160325556", categorie: "C2H", temps_ms: 57860, coureur1: "Lucas DELEPLANCQUE", coureur2: "Paul DELEPLANCQUE" },
  { rang: 8, code_bateau: "C2H238733387409", categorie: "C2H", temps_ms: 59160, coureur1: "Thibaut COLLIGNON",  coureur2: "Mathieu DUBOIS" },
  // K1D
  { rang:  1, code_bateau: "K1D264765", categorie: "K1DM22", temps_ms: 56120, coureur1: "Laura FONTAINE" },
  { rang:  2, code_bateau: "K1D196731", categorie: "K1DM22", temps_ms: 57010, coureur1: "Lisa LEBOUC" },
  { rang:  3, code_bateau: "K1D183216", categorie: "K1DM22", temps_ms: 57030, coureur1: "Clara GAUBERT" },
  { rang:  4, code_bateau: "K1D242439", categorie: "K1DM22", temps_ms: 57470, coureur1: "Emma LACOSTE" },
  { rang:  5, code_bateau: "K1D269173", categorie: "K1DU21", temps_ms: 58120, coureur1: "Noa PRADALIER" },
  { rang:  6, code_bateau: "K1D290601", categorie: "K1DU21", temps_ms: 58230, coureur1: "Eve VITALI-GUILBERT" },
  { rang:  7, code_bateau: "K1D224719", categorie: "K1DM22", temps_ms: 59680, coureur1: "Elsa GAUBERT" },
  { rang:  8, code_bateau: "K1D365500", categorie: "K1DU21", temps_ms: 59890, coureur1: "Camille DESMERGER" },
  { rang:  9, code_bateau: "K1D433941", categorie: "K1DU21", temps_ms: 60530, coureur1: "Elina PROCESSE" },
  { rang: 10, code_bateau: "K1D280682", categorie: "K1DU21", temps_ms: 60830, coureur1: "Nora KOUBAITI" },
  { rang: 11, code_bateau: "K1D295071", categorie: "K1DM22", temps_ms: 77940, coureur1: "Elke SARAGAS" },
  // K1H  (rang 10 NIKIEMA-SCHWARZ → EXCLU)
  { rang:  1, code_bateau: "K1H195229", categorie: "K1HM22", temps_ms: 49530, coureur1: "Maxence BAROUH" },
  { rang:  2, code_bateau: "K1H329293", categorie: "K1HM22", temps_ms: 49810, coureur1: "Raphael BONNARD" },
  { rang:  3, code_bateau: "K1H280999", categorie: "K1HM22", temps_ms: 50260, coureur1: "Luca BARONE" },
  { rang:  4, code_bateau: "K1H316181", categorie: "K1HM22", temps_ms: 50590, coureur1: "Dimitri TOSTAIN" },
  { rang:  5, code_bateau: "K1H241898", categorie: "K1HM22", temps_ms: 50630, coureur1: "Titouan DOREAU" },
  { rang:  6, code_bateau: "K1H339933", categorie: "K1HM22", temps_ms: 50730, coureur1: "Leandre BEAULANDE NOEL" },
  { rang:  7, code_bateau: "K1H241168", categorie: "K1HM22", temps_ms: 51240, coureur1: "Clement MONJANEL" },
  { rang:  8, code_bateau: "K1H243099", categorie: "K1HM22", temps_ms: 51470, coureur1: "Corentin GEORGEON" },
  { rang:  9, code_bateau: "K1H244233", categorie: "K1HM22", temps_ms: 51650, coureur1: "Maxence GUIZIOU" },
  // rang 10 NIKIEMA-SCHWARZ → EXCLU
  { rang: 11, code_bateau: "K1H316182", categorie: "K1HM22", temps_ms: 51860, coureur1: "Jerome PAYEN" },
  { rang: 12, code_bateau: "K1H298267", categorie: "K1HU21", temps_ms: 52100, coureur1: "Hugo PELLISSIER" },
  { rang: 13, code_bateau: "K1H235470", categorie: "K1HM22", temps_ms: 52720, coureur1: "Jules MIGLINIEKS" },
  { rang: 14, code_bateau: "K1H309114", categorie: "K1HU21", temps_ms: 52740, coureur1: "Louis PAGES" },
  { rang: 15, code_bateau: "K1H324904", categorie: "K1HU21", temps_ms: 53140, coureur1: "Audren LE DORE" },
];

// ─── COURSE 3 — Sprint N°2 Finale A — 10/04/2026 ─────────────────────────────

const COURSE3: Row[] = [
  // C1D
  { rang: 1, code_bateau: "C1D290601", categorie: "C1D", temps_ms: 60400, coureur1: "Eve VITALI-GUILBERT" },
  { rang: 2, code_bateau: "C1D224719", categorie: "C1D", temps_ms: 61600, coureur1: "Elsa GAUBERT" },
  // C1H  (rang 9 DINALLY → EXCLU)
  { rang: 1, code_bateau: "C1H215482", categorie: "C1HM22", temps_ms: 53790, coureur1: "Charles FERRION" },
  { rang: 2, code_bateau: "C1H222871", categorie: "C1HM22", temps_ms: 54160, coureur1: "Nicolas SAUTEUR" },
  { rang: 3, code_bateau: "C1H194386", categorie: "C1HM22", temps_ms: 54650, coureur1: "Theo VIENS" },
  { rang: 4, code_bateau: "C1H296766", categorie: "C1HM22", temps_ms: 55080, coureur1: "Gaetan ROUSSEAU" },
  { rang: 5, code_bateau: "C1H214315", categorie: "C1HM22", temps_ms: 55410, coureur1: "Etienne KLATT" },
  { rang: 6, code_bateau: "C1H309196", categorie: "C1HM22", temps_ms: 56120, coureur1: "Matteo ZANNI" },
  { rang: 7, code_bateau: "C1H258449", categorie: "C1HU21", temps_ms: 57410, coureur1: "Jan Gabin PISCHEK" },
  { rang: 8, code_bateau: "C1H325556", categorie: "C1HU21", temps_ms: 58300, coureur1: "Paul DELEPLANCQUE" },
  // rang 9 DINALLY → EXCLU
  // K1D
  { rang: 1, code_bateau: "K1D196731", categorie: "K1DM22", temps_ms: 54260, coureur1: "Lisa LEBOUC" },
  { rang: 2, code_bateau: "K1D183216", categorie: "K1DM22", temps_ms: 54570, coureur1: "Clara GAUBERT" },
  { rang: 3, code_bateau: "K1D295071", categorie: "K1DM22", temps_ms: 56400, coureur1: "Elke SARAGAS" },
  { rang: 4, code_bateau: "K1D269173", categorie: "K1DU21", temps_ms: 56460, coureur1: "Noa PRADALIER" },
  { rang: 5, code_bateau: "K1D242439", categorie: "K1DM22", temps_ms: 56640, coureur1: "Emma LACOSTE" },
  { rang: 6, code_bateau: "K1D224719", categorie: "K1DM22", temps_ms: 56680, coureur1: "Elsa GAUBERT" },
  { rang: 7, code_bateau: "K1D280682", categorie: "K1DU21", temps_ms: 57660, coureur1: "Nora KOUBAITI" },
  { rang: 8, code_bateau: "K1D294600", categorie: "K1DM22", temps_ms: 59400, coureur1: "Julie HUCHON" },
  { rang: 9, code_bateau: "K1D365500", categorie: "K1DU21", temps_ms: 59410, coureur1: "Camille DESMERGER" },
  // K1H  (rang 15 LE GUENNEC → EXCLU)
  { rang:  1, code_bateau: "K1H329293", categorie: "K1HM22", temps_ms: 49010, coureur1: "Raphael BONNARD" },
  { rang:  2, code_bateau: "K1H241168", categorie: "K1HM22", temps_ms: 49110, coureur1: "Clement MONJANEL" },
  { rang:  3, code_bateau: "K1H280999", categorie: "K1HM22", temps_ms: 49270, coureur1: "Luca BARONE" },
  { rang:  4, code_bateau: "K1H241898", categorie: "K1HM22", temps_ms: 49480, coureur1: "Titouan DOREAU" },
  { rang:  5, code_bateau: "K1H316181", categorie: "K1HM22", temps_ms: 49630, coureur1: "Dimitri TOSTAIN" },
  { rang:  6, code_bateau: "K1H339933", categorie: "K1HM22", temps_ms: 49760, coureur1: "Leandre BEAULANDE NOEL" },
  { rang:  7, code_bateau: "K1H298267", categorie: "K1HU21", temps_ms: 50330, coureur1: "Hugo PELLISSIER" },
  { rang:  8, code_bateau: "K1H416272", categorie: "K1HU21", temps_ms: 50640, coureur1: "Axel DURRACQ" },
  { rang:  9, code_bateau: "K1H316182", categorie: "K1HM22", temps_ms: 50750, coureur1: "Jerome PAYEN" },
  { rang:  9, code_bateau: "K1H244233", categorie: "K1HM22", temps_ms: 50750, coureur1: "Maxence GUIZIOU" },
  { rang: 11, code_bateau: "K1H243099", categorie: "K1HM22", temps_ms: 50760, coureur1: "Corentin GEORGEON" },
  { rang: 12, code_bateau: "K1H239805", categorie: "K1HM22", temps_ms: 50850, coureur1: "Corentin COMBE" },
  { rang: 13, code_bateau: "K1H_DURAND",  categorie: "K1HM22", temps_ms: 51170, coureur1: "Timothe DURAND" },
  { rang: 14, code_bateau: "K1H340002", categorie: "K1HU21", temps_ms: 51400, coureur1: "Felix GRONDIN" },
  // rang 15 LE GUENNEC → EXCLU
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function run() {
  // Cache athlètes (code_bateau → id)
  const { data: athletesData } = await supabase.from("athletes").select("id, code_bateau");
  const athleteMap = new Map(athletesData?.map((a) => [a.code_bateau, a.id]) ?? []);
  console.log(`${PREFIX} ${athleteMap.size} athlètes en cache`);

  // Trouver ou créer la compétition (pas de code_ffck, upsert sur nom + date)
  const NOM = "Sélection Équipe de France Descente — Embrun 2026";
  const DATE_DEBUT = "2026-04-08";

  let compId: string;
  const { data: existing } = await supabase
    .from("ffck_competitions")
    .select("id")
    .eq("nom", NOM)
    .eq("date_debut", DATE_DEBUT)
    .maybeSingle();

  if (existing) {
    compId = existing.id;
    console.log(`${PREFIX} Compétition existante : ${compId}`);
  } else {
    const { data: created, error: createErr } = await supabase
      .from("ffck_competitions")
      .insert({
        nom: NOM,
        ville: "05200 EMBRUN",
        riviere: "Durance",
        date_debut: DATE_DEBUT,
        date_fin: "2026-04-10",
        code_niveau: "NAT",
        code_type: "SEF",
        annee: 2026,
        nb_courses: 3,
      })
      .select("id")
      .single();
    if (createErr) throw new Error(`Création compétition: ${createErr.message}`);
    compId = created.id;
    console.log(`${PREFIX} Compétition créée : ${compId}`);
  }

  // Upsert 3 courses
  const coursesInput = [
    { competition_id: compId, code_course: 1, libelle: "Classique",           date_course: "2026-04-08" },
    { competition_id: compId, code_course: 2, libelle: "Sprint N°1 Finale A", date_course: "2026-04-09" },
    { competition_id: compId, code_course: 3, libelle: "Sprint N°2 Finale A", date_course: "2026-04-10" },
  ];

  const { data: createdCourses, error: courseErr } = await supabase
    .from("ffck_courses")
    .upsert(coursesInput, { onConflict: "competition_id,code_course" })
    .select("id, code_course, libelle");
  if (courseErr) throw new Error(`Création courses: ${courseErr.message}`);

  const courseMap = new Map(createdCourses!.map((c) => [c.code_course, { id: c.id, libelle: c.libelle }]));
  console.log(`${PREFIX} 3 courses prêtes`);

  // Insérer les résultats par course
  const allCourses: [number, Row[]][] = [
    [1, COURSE1],
    [2, COURSE2],
    [3, COURSE3],
  ];

  for (const [courseNum, rows] of allCourses) {
    const courseInfo = courseMap.get(courseNum);
    if (!courseInfo) { console.error(`${PREFIX} Course ${courseNum} introuvable en DB`); continue; }

    // Filtrer les exclus (sécurité — les données ci-dessus les ont déjà retirés)
    const validRows = rows.filter((r) => !EXCLUDED_CODES.has(r.code_bateau));
    const excluded = rows.length - validRows.length;

    const dbRows = validRows.map((r) => ({
      course_id:       courseInfo.id,
      athlete_id:      athleteMap.get(r.code_bateau) ?? null,
      code_bateau:     r.code_bateau,
      rang:            r.rang ?? null,
      categorie:       r.categorie,
      temps_chrono:    r.temps_ms ?? null,
      points:          null,
      dsq:             r.dsq ?? false,
      coureur1_nom:    r.coureur1 ?? null,
      coureur1_prenom: null,
      coureur1_club:   null,
      coureur2_nom:    r.coureur2 ?? null,
      coureur2_prenom: null,
      coureur2_club:   null,
    }));

    const { data: inserted, error: insErr } = await supabase
      .from("ffck_resultats")
      .upsert(dbRows, { onConflict: "course_id,code_bateau,categorie" })
      .select("id");

    if (insErr) {
      console.error(`${PREFIX} ❌ Course ${courseNum} (${courseInfo.libelle}): ${insErr.message}`);
      continue;
    }

    const nbInserted = inserted?.length ?? 0;
    const noAthleteId = dbRows.filter((r) => r.athlete_id === null).length;

    // Mettre à jour synced_at + nb_participants
    await supabase
      .from("ffck_courses")
      .update({ synced_at: new Date().toISOString(), nb_participants: nbInserted })
      .eq("id", courseInfo.id);

    console.log(
      `${PREFIX} Course ${courseNum} (${courseInfo.libelle}) : ` +
      `${nbInserted} résultats insérés, ${excluded} exclus, ${noAthleteId} athlete_id null`
    );
  }

  console.log(`${PREFIX} ✓ Import terminé`);
}

run().catch((err) => { console.error("❌", err); process.exit(1); });
