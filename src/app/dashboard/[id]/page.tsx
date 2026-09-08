import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { TEMPLATES } from "@/lib/templates";
import { deleteInvite, updateInvite } from "@/app/actions";
import { InviteForm } from "@/components/InviteForm";
import { ShareLink } from "@/components/ShareLink";
import { Brand, Button, Shell } from "@/components/ui";

export default async function EditInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { saved } = await searchParams;

  const invite = await db.invite.findFirst({ where: { id, userId: user.id } });
  if (!invite) notFound();

  const photos = await db.facePhoto.findMany({
    where: { inviteId: invite.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, storageUrl: true, role: true },
  });
  const existingPhotos = {
    bride: photos.filter((p) => p.role === "BRIDE").map(({ id, storageUrl }) => ({ id, storageUrl })),
    groom: photos.filter((p) => p.role === "GROOM").map(({ id, storageUrl }) => ({ id, storageUrl })),
  };

  const activeStatuses = [
    "PENDING",
    "GENERATING_LAST_FRAME",
    "AWAITING_APPROVAL",
    "QUEUED_VIDEO",
    "GENERATING_VIDEO",
    "ENCODING",
    "READY",
    "FAILED",
  ] as const;
  const initialJob = await db.generationJob.findFirst({
    where: { inviteId: invite.id, status: { in: [...activeStatuses] } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Shell>
      <header className="flex items-center justify-between">
        <Brand />
        <Link href="/dashboard" className="text-xs uppercase tracking-[0.24em] text-[#9b5f36]">
          Back
        </Link>
      </header>

      <div className="mt-16 flex flex-wrap items-end justify-between gap-6">
        <h1 className="text-4xl" style={{ fontFamily: "Georgia, serif" }}>
          {invite.partnerOne} &amp; {invite.partnerTwo}
        </h1>
        {saved && (
          <p className="rounded-sm border border-[#4a7355]/30 bg-[#eef5ec] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#3c5f45]">
            Saved
          </p>
        )}
      </div>

      <ShareLink slug={invite.slug} published={invite.published} />

      <InviteForm
        action={updateInvite}
        templates={TEMPLATES}
        submitLabel="Save changes"
        existingPhotos={existingPhotos}
        initialJob={initialJob}
        draft={{
          id: invite.id,
          slug: invite.slug,
          templateId: invite.templateId,
          cardStyle: invite.cardStyle,
          attireBrideId: invite.attireBrideId ?? "",
          attireGroomId: invite.attireGroomId ?? "",
          regenerationCount: invite.regenerationCount,
          maxRegenerations: invite.maxRegenerations,
          partnerOne: invite.partnerOne,
          partnerTwo: invite.partnerTwo,
          eyebrow: invite.eyebrow,
          taglineLead: invite.taglineLead,
          taglineSub: invite.taglineSub,
          arrivalNote: invite.arrivalNote,
          blessing: invite.blessing,
          eventDate: invite.eventDate,
          eventTime: invite.eventTime,
          venueName: invite.venueName,
          mapsUrl: invite.mapsUrl ?? "",
          closingNote: invite.closingNote,
          published: invite.published,
        }}
      />

      <form action={deleteInvite} className="mt-16 border-t border-[#c9956a]/25 pt-10">
        <input type="hidden" name="id" value={invite.id} />
        <Button variant="danger" type="submit">
          Delete invitation
        </Button>
      </form>
    </Shell>
  );
}
