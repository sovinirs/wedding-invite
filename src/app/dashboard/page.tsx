import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { getTemplate } from "@/lib/templates";
import { signOut } from "@/app/actions";
import { Brand, Shell } from "@/components/ui";

export default async function Dashboard() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const invites = await db.invite.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <Shell>
      <header className="flex items-center justify-between">
        <Brand />
        <form action={signOut}>
          <button className="text-xs uppercase tracking-[0.24em] text-[#9b5f36]">Sign out</button>
        </form>
      </header>

      <div className="mt-16 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl" style={{ fontFamily: "Georgia, serif" }}>
            Your invitations
          </h1>
          <p className="mt-2 text-sm text-[#6b4c3d]">
            Signed in as {user.email}
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="inline-flex items-center rounded-sm bg-[#2b1710] px-6 py-3 text-xs uppercase tracking-[0.24em] text-[#fdf6ec] transition-colors hover:bg-[#3f2318]"
        >
          New invitation
        </Link>
      </div>

      {invites.length === 0 ? (
        <p className="mt-16 rounded-sm border border-dashed border-[#c9956a]/40 px-8 py-16 text-center text-sm text-[#6b4c3d]">
          Nothing here yet. Create your first invitation and share the link.
        </p>
      ) : (
        <ul className="mt-12 flex flex-col gap-4">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-6 rounded-sm border border-[#c9956a]/25 bg-white px-6 py-5"
            >
              <div>
                <p className="text-xl" style={{ fontFamily: "Georgia, serif" }}>
                  {invite.partnerOne} &amp; {invite.partnerTwo}
                </p>
                <p className="mt-1 text-xs text-[#8a6b5c]">
                  /i/{invite.slug} · {getTemplate(invite.templateId).name} ·{" "}
                  {invite.published ? "Published" : "Draft"}
                </p>
              </div>
              <div className="flex items-center gap-5 text-xs uppercase tracking-[0.24em]">
                {invite.published && (
                  <a
                    href={`/i/${invite.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#9b5f36]"
                  >
                    View
                  </a>
                )}
                <Link href={`/dashboard/${invite.id}`} className="text-[#2b1710]">
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
