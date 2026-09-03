/**
 * Runs once, before the server accepts its first request. A missing or weak
 * SESSION_SECRET cannot be papered over — cookies could not be signed — so it
 * used to surface as an opaque error digest the first time someone signed in.
 * Failing here instead stops the deploy with a message that says what to fix.
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const problems: string[] = [];

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    problems.push("SESSION_SECRET is not set.");
  } else if (secret.length < 32) {
    problems.push(
      `SESSION_SECRET is ${secret.length} characters long; at least 32 are required.`,
    );
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    problems.push("DATABASE_URL is not set.");
  } else if (url.startsWith("file:")) {
    problems.push(
      "DATABASE_URL points at a SQLite file. This app runs on Postgres — a " +
        "file-backed database is wiped on every deploy. Use a postgresql:// URL.",
    );
  }

  if (problems.length > 0) {
    throw new Error(
      [
        "Invalid environment configuration:",
        ...problems.map((p) => `  - ${p}`),
        "",
        "Generate a session secret with:",
        `  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
        "",
        "Set it in .env for local development, and in your host's environment",
        "variables (Vercel: Project Settings -> Environment Variables) once deployed.",
      ].join("\n"),
    );
  }
}
