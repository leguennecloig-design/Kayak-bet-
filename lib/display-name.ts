export function displayName(row: { username?: string | null; email?: string | null }): string {
  if (row.username) return row.username;
  const e = row.email ?? "";
  const base = e.split("@")[0].replace(/[._-]+/g, " ").trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function initials(name: string): string {
  const parts = name.split(" ");
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}
