import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { TEMPLATES } from "@/lib/templates";
import { Brand, Shell } from "@/components/ui";

export default async function Home() {
  const user = await currentUser();

  return (
    <Shell>
      <header className="flex items-center justify-between">
        <Brand />
        <nav className="flex items-center gap-6 text-xs uppercase tracking-[0.24em] text-[#9b5f36]">
          {user ? (
            <Link href="/dashboard">Dashboard</Link>
          ) : (
            <>
              <Link href="/login">Sign in</Link>
              <Link href="/signup" className="text-[#2b1710]">
                Create yours
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mt-24 max-w-2xl md:mt-32">
        <p className="text-[11px] uppercase tracking-[0.48em] text-[#9b5f36]">
          A cinematic entrance
        </p>
        <h1
          className="mt-6 text-balance text-5xl font-normal leading-[1.05] md:text-7xl"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Your invitation, as a film you scroll through.
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-8 text-[#5a3f32]">
          Choose a cinematic, write your details, and share a single link. Guests scrub
          through the entrance with their thumb and arrive at your invitation.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href={user ? "/dashboard/new" : "/signup"}
            className="inline-flex items-center rounded-sm bg-[#2b1710] px-7 py-4 text-xs uppercase tracking-[0.24em] text-[#fdf6ec] transition-colors hover:bg-[#3f2318]"
          >
            Create an invitation
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-sm border border-[#c9956a]/45 px-7 py-4 text-xs uppercase tracking-[0.24em] text-[#9b5f36] transition-colors hover:bg-[#f3e7db]"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="mt-28 border-t border-[#c9956a]/25 pt-14">
        <p className="text-[10px] uppercase tracking-[0.4em] text-[#9b5f36]">Cinematics</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {TEMPLATES.map((t) => (
            <div key={t.id} className="rounded-sm border border-[#c9956a]/25 bg-white p-6">
              <p
                className="text-xl"
                style={{ fontFamily: "Georgia, serif", color: t.palette.ink }}
              >
                {t.name}
              </p>
              <p className="mt-3 text-sm leading-6 text-[#6b4c3d]">{t.description}</p>
              <div
                className="mt-6 h-1 w-16 rounded-full"
                style={{ background: t.palette.soft }}
              />
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
