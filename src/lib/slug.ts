const RESERVED = new Set([
  "api", "dashboard", "login", "signup", "logout", "i", "new", "edit",
  "admin", "static", "_next", "templates", "favicon.ico",
]);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 60);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,59}$/.test(slug) && !RESERVED.has(slug);
}

/** Derives a slug from two names, appending a short suffix if it is taken. */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || "invite";
  if (!(await exists(root)) && isValidSlug(root)) return root;
  for (let i = 0; i < 40; i++) {
    const candidate = `${root}-${Math.random().toString(36).slice(2, 6)}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}
