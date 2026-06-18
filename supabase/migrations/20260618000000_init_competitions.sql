-- ============================================================
-- Kayakbet — Migration initiale : compétitions & participants
-- ============================================================

-- Table des compétitions
create table if not exists competitions (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  date        date,
  discipline  text,
  lieu        text,
  status      text default 'draft',  -- draft | published | closed
  created_at  timestamptz default now()
);

-- Table des participants (startlist)
create table if not exists participants (
  id              uuid primary key default gen_random_uuid(),
  competition_id  uuid references competitions(id) on delete cascade,
  nom             text not null,
  pays            text,
  cote            numeric
);

-- Activer Row Level Security (les tables sont privées par défaut)
alter table competitions enable row level security;
alter table participants enable row level security;

-- Le public (utilisateurs non-admin, anonymes) peut lire uniquement
-- les compétitions publiées
create policy "Public peut voir les comp publiées"
  on competitions for select
  using (status = 'published');

-- Le public peut lire les participants d'une compétition publiée
create policy "Public peut voir les participants des comp publiées"
  on participants for select
  using (
    competition_id in (
      select id from competitions where status = 'published'
    )
  );

-- Note : pas de policy insert/update/delete ici.
-- L'écriture admin passe par la SUPABASE_SERVICE_ROLE_KEY côté serveur,
-- qui bypasse automatiquement RLS — sécurité gérée dans admin-guard.ts.
