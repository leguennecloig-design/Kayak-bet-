"use client";

import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string };
type NavGroup = { label: string; links: NavLink[] };

const GROUPS: NavGroup[] = [
  {
    label: "Compétitions",
    links: [
      { href: "/admin", label: "Vue d'ensemble" },
      { href: "/admin/competitions/nouvelle", label: "Création compétition" },
    ],
  },
  {
    label: "Cotes & données",
    links: [
      { href: "/admin/data", label: "Données FFCK" },
    ],
  },
  {
    label: "Athlètes",
    links: [{ href: "/admin/athletes", label: "Athlètes" }],
  },
  {
    label: "Notifications",
    links: [{ href: "/admin/notifications", label: "Diffusion push" }],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-5">
      {GROUPS.map((group) => {
        const groupActive = group.links.some((l) => isActive(pathname, l.href));
        return (
          <div key={group.label} className="flex flex-col gap-1">
            <span
              className={`font-grotesk font-bold text-[9px] tracking-[.12em] uppercase px-1 ${
                groupActive ? "text-[#28D7E6]" : "text-[#4a6a7a]"
              }`}
            >
              {group.label}
            </span>
            <div className="flex items-center gap-0.5">
              {group.links.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`font-archivo font-semibold text-[12.5px] px-2.5 py-1.5 rounded-lg transition-colors ${
                      active
                        ? "text-white bg-[rgba(40,215,230,.12)]"
                        : "text-[#9fbac6] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {link.label}
                  </a>
                );
              })}
            </div>
          </div>
        );
      })}
      <a
        href="/app"
        className="font-archivo font-semibold text-[13px] text-[#9fbac6] hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors ml-2"
      >
        ← App
      </a>
    </nav>
  );
}
