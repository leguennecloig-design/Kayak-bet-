// Page principale du panneau admin — liste toutes les compétitions
// Cette page est un Server Component : elle vérifie l'accès côté serveur
// avant de rendre quoi que ce soit.

import { adminGuard } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import Link from "next/link";

// Couleurs des badges selon le statut
const STATUS_STYLE: Record<string, string> = {
  draft:     "bg-[rgba(255,122,69,.15)] text-[#FF7A45] border-[rgba(255,122,69,.3)]",
  published: "bg-[rgba(40,215,230,.12)] text-[#28D7E6] border-[rgba(40,215,230,.3)]",
  closed:    "bg-[rgba(255,255,255,.06)] text-[#7c9aaa] border-[rgba(255,255,255,.1)]",
};
const STATUS_LABEL: Record<string, string> = {
  draft:     "Brouillon",
  published: "Publié",
  closed:    "Terminé",
};

export default async function AdminDashboard() {
  // Bloque l'accès si pas admin — redirige vers "/" sinon
  await adminGuard();

  const supabase = createAdminSupabase();
  const { data: competitions, error } = await supabase
    .from("competitions")
    .select("id, nom, date, discipline, lieu, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9]">
            Compétitions
          </h1>
          <p className="font-archivo text-[14px] text-[#7c9aaa] mt-2">
            {competitions?.length ?? 0} au total — brouillons et publiées
          </p>
        </div>
        <Link
          href="/admin/competitions/nouvelle"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#28D7E6] to-[#11C2C2] text-[#0A2A3D] font-archivo font-bold text-[13px] px-5 py-3 rounded-[11px] hover:-translate-y-[1px] transition-transform"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          Nouvelle compétition
        </Link>
      </div>

      {error && (
        <div className="bg-[rgba(255,122,69,.1)] border border-[rgba(255,122,69,.3)] rounded-xl px-5 py-4 font-archivo text-[13px] text-[#FF7A45] mb-6">
          Erreur de chargement : {error.message}
        </div>
      )}

      {!competitions?.length ? (
        <div className="text-center py-20 border border-dashed border-[var(--border-2)] rounded-2xl">
          <p className="font-archivo text-[15px] text-[#5c7c8c]">Aucune compétition pour l'instant.</p>
          <Link
            href="/admin/competitions/nouvelle"
            className="inline-block mt-4 font-archivo font-bold text-[13px] text-[#28D7E6] hover:underline"
          >
            Créer la première →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {competitions.map((c) => (
            <Link
              key={c.id}
              href={`/admin/competitions/${c.id}`}
              className="group flex items-center justify-between gap-4 bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] hover:border-[rgba(40,215,230,.4)] rounded-[16px] px-6 py-5 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span
                    className={`font-grotesk font-bold text-[9.5px] tracking-[.1em] uppercase border rounded-[5px] px-[7px] py-[3px] ${STATUS_STYLE[c.status] ?? STATUS_STYLE.draft}`}
                  >
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                  {c.discipline && (
                    <span className="font-grotesk font-bold text-[9.5px] tracking-[.1em] uppercase text-[#7c9aaa]">
                      {c.discipline}
                    </span>
                  )}
                </div>
                <div className="font-archivo font-extrabold text-[16px] text-white truncate group-hover:text-[#28D7E6] transition-colors">
                  {c.nom}
                </div>
                <div className="font-archivo text-[12.5px] text-[#5c7c8c] mt-1 flex items-center gap-3">
                  {c.lieu && <span>{c.lieu}</span>}
                  {c.date && (
                    <span>
                      {new Date(c.date).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[#5c7c8c] group-hover:text-[#28D7E6] flex-none transition-colors">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
