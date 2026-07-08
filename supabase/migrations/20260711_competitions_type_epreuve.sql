-- competitions n'avait aucune colonne pour distinguer deux épreuves
-- différentes d'un même jour/nom (ex: "Manche 1" vs "Finale", ou
-- Sprint vs Classique importés séparément) — le matching lors de
-- l'import PDF (nom + date) fusionnait ces épreuves distinctes dans
-- la MÊME compétition de paris, et chaque nouvel import écrasait les
-- participants de la précédente (participants.delete() avant réinsert).
--
-- ffck_courses distinguait déjà correctement les épreuves via sa colonne
-- libelle — cette migration aligne le côté "paris" sur le même principe.
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS type_epreuve TEXT;

-- Backfill : les compétitions déjà importées via PDF (donc sans
-- ffck_inscription_code, contrairement à celles importées via le scan
-- FFCK) ont toutes été parsées avec le défaut du parser ('Classique')
-- tant que le PDF ne contenait pas explicitement "Liste de Départ par
-- Epreuves : ...". Sans ce backfill, un ré-import futur de la même
-- épreuve ne matcherait plus ces anciennes lignes (type_epreuve NULL)
-- et créerait une compétition en double.
UPDATE competitions
SET type_epreuve = 'Classique'
WHERE type_epreuve IS NULL
  AND ffck_inscription_code IS NULL;
